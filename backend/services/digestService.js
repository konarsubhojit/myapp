import { eq, and, gte, lt, ne, or, sql } from 'drizzle-orm';
import { getDatabase } from '../db/connection.js';
import { orders, orderReminderState, digestRuns, notificationRecipients } from '../db/schema.js';
import { createLogger } from '../utils/logger.js';
import { computeDigestBuckets, getTodayInKolkata, formatDateForDigest } from '../utils/digestBuckets.js';
import { sendEmail, buildDigestEmailHtml } from './emailService.js';

const logger = createLogger('DigestService');

/**
 * Get enabled notification recipients
 * @returns {Promise<Array>} List of enabled recipients
 */
export async function getEnabledRecipients() {
  const db = getDatabase();
  return db.select()
    .from(notificationRecipients)
    .where(eq(notificationRecipients.enabled, true));
}

/**
 * Check if digest has already been sent for a given date
 * @param {string} digestDate - Date in YYYY-MM-DD format (Kolkata)
 * @returns {Promise<Object|null>} Existing digest run or null
 */
export async function getDigestRunForDate(digestDate) {
  const db = getDatabase();
  const result = await db.select()
    .from(digestRuns)
    .where(eq(digestRuns.digestDate, digestDate));
  
  return result.length > 0 ? result[0] : null;
}

/**
 * Create or update a digest run record
 * @param {string} digestDate - Date in YYYY-MM-DD format
 * @param {string} status - Status: started, sent, or failed
 * @param {string|null} error - Error message if failed
 * @returns {Promise<Object>} Created/updated digest run
 */
export async function upsertDigestRun(digestDate, status, error = null) {
  const db = getDatabase();
  
  const existing = await getDigestRunForDate(digestDate);
  
  if (existing) {
    const updateData = { status, updatedAt: new Date() };
    if (status === 'sent') {
      updateData.sentAt = new Date();
    }
    if (error) {
      updateData.error = error;
    }
    
    await db.update(digestRuns)
      .set(updateData)
      .where(eq(digestRuns.digestDate, digestDate));
    
    return { ...existing, ...updateData };
  }

  const result = await db.insert(digestRuns)
    .values({
      digestDate,
      status,
      startedAt: new Date(),
      sentAt: status === 'sent' ? new Date() : null,
      error
    })
    .returning();
  
  return result[0];
}

/**
 * Query orders for a specific time bucket, excluding completed and already-sent
 * @param {Date} bucketStart - Start of the bucket (inclusive)
 * @param {Date} bucketEnd - End of the bucket (exclusive)
 * @param {string} tierFlag - Which sent flag to check: 'sent_1d', 'sent_3d', or 'sent_7d'
 * @returns {Promise<Array>} Orders in this bucket
 */
export async function getOrdersForBucket(bucketStart, bucketEnd, tierFlag) {
  const db = getDatabase();
  
  // Get orders in the bucket that are not completed
  // and haven't had this tier reminder sent yet
  const ordersResult = await db.select({
    id: orders.id,
    orderId: orders.orderId,
    customerName: orders.customerName,
    expectedDeliveryDate: orders.expectedDeliveryDate,
    status: orders.status
  })
    .from(orders)
    .leftJoin(orderReminderState, eq(orders.id, orderReminderState.orderId))
    .where(
      and(
        // Expected delivery date is in the bucket
        gte(orders.expectedDeliveryDate, bucketStart),
        lt(orders.expectedDeliveryDate, bucketEnd),
        // Not completed
        ne(orders.status, 'completed'),
        // Not cancelled
        ne(orders.status, 'cancelled'),
        // Either no reminder state exists OR the specific tier flag is false
        or(
          sql`${orderReminderState.orderId} IS NULL`,
          tierFlag === 'sent_1d' 
            ? eq(orderReminderState.sent1d, false)
            : tierFlag === 'sent_3d'
              ? eq(orderReminderState.sent3d, false)
              : eq(orderReminderState.sent7d, false)
        )
      )
    )
    .orderBy(orders.expectedDeliveryDate, orders.orderId);

  return ordersResult;
}

/**
 * Mark orders as having received a reminder for a specific tier
 * @param {number[]} orderIds - Order IDs to mark
 * @param {string} tier - Which tier: '1d', '3d', or '7d'
 */
export async function markOrdersAsSent(orderIds, tier) {
  if (orderIds.length === 0) return;
  
  const db = getDatabase();
  
  const flagColumn = tier === '1d' ? 'sent1d' : tier === '3d' ? 'sent3d' : 'sent7d';
  
  for (const orderId of orderIds) {
    // Get the order's expected delivery date for the snapshot
    const orderResult = await db.select({ expectedDeliveryDate: orders.expectedDeliveryDate })
      .from(orders)
      .where(eq(orders.id, orderId));
    
    if (orderResult.length === 0) continue;
    
    const deliveryDate = orderResult[0].expectedDeliveryDate;
    
    // Upsert the reminder state
    const existing = await db.select()
      .from(orderReminderState)
      .where(eq(orderReminderState.orderId, orderId));
    
    if (existing.length > 0) {
      const updateData = { updatedAt: new Date() };
      updateData[flagColumn] = true;
      
      await db.update(orderReminderState)
        .set(updateData)
        .where(eq(orderReminderState.orderId, orderId));
    } else {
      const insertData = {
        orderId,
        deliveryDateSnapshot: deliveryDate,
        sent7d: tier === '7d',
        sent3d: tier === '3d',
        sent1d: tier === '1d',
        updatedAt: new Date()
      };
      
      await db.insert(orderReminderState).values(insertData);
    }
  }
}

/**
 * Upsert order reminder state when an order is created or delivery date changes
 * @param {number} orderId - The order's database ID
 * @param {Date} expectedDeliveryDate - The expected delivery date
 */
export async function upsertOrderReminderState(orderId, expectedDeliveryDate) {
  if (!expectedDeliveryDate) return;
  
  const db = getDatabase();
  
  const existing = await db.select()
    .from(orderReminderState)
    .where(eq(orderReminderState.orderId, orderId));
  
  if (existing.length > 0) {
    const existingSnapshot = existing[0].deliveryDateSnapshot;
    
    // If the delivery date changed, reset all flags
    if (existingSnapshot.getTime() !== expectedDeliveryDate.getTime()) {
      await db.update(orderReminderState)
        .set({
          deliveryDateSnapshot: expectedDeliveryDate,
          sent7d: false,
          sent3d: false,
          sent1d: false,
          updatedAt: new Date()
        })
        .where(eq(orderReminderState.orderId, orderId));
    }
  } else {
    // Create new reminder state
    await db.insert(orderReminderState).values({
      orderId,
      deliveryDateSnapshot: expectedDeliveryDate,
      sent7d: false,
      sent3d: false,
      sent1d: false,
      updatedAt: new Date()
    });
  }
}

/**
 * Run the daily digest
 * @returns {Promise<Object>} Result of the digest run
 */
export async function runDailyDigest() {
  const digestDate = getTodayInKolkata();
  
  logger.info('Starting daily digest', { digestDate });
  
  // Check idempotency
  const existingRun = await getDigestRunForDate(digestDate);
  if (existingRun && existingRun.status === 'sent') {
    logger.info('Digest already sent for this date', { digestDate });
    return { status: 'already_sent', digestDate };
  }
  
  // Mark as started
  await upsertDigestRun(digestDate, 'started');
  
  try {
    // Get recipients
    const recipients = await getEnabledRecipients();
    
    if (recipients.length === 0) {
      logger.warn('No enabled recipients found');
      await upsertDigestRun(digestDate, 'sent');
      return { status: 'sent', digestDate, message: 'No recipients configured' };
    }
    
    // Compute buckets
    const buckets = computeDigestBuckets();
    
    // Get orders for each bucket
    const oneDayOrders = await getOrdersForBucket(buckets['1d'].start, buckets['1d'].end, 'sent_1d');
    const threeDayOrders = await getOrdersForBucket(buckets['3d'].start, buckets['3d'].end, 'sent_3d');
    const sevenDayOrders = await getOrdersForBucket(buckets['7d'].start, buckets['7d'].end, 'sent_7d');
    
    logger.info('Orders found for digest', {
      oneDayCount: oneDayOrders.length,
      threeDayCount: threeDayOrders.length,
      sevenDayCount: sevenDayOrders.length
    });
    
    // If all buckets are empty, mark as sent and return
    if (oneDayOrders.length === 0 && threeDayOrders.length === 0 && sevenDayOrders.length === 0) {
      logger.info('No orders to send in digest');
      await upsertDigestRun(digestDate, 'sent');
      return { status: 'sent', digestDate, message: 'No orders requiring reminders' };
    }
    
    // Build and send email
    const recipientEmails = recipients.map(r => r.email);
    const emailHtml = buildDigestEmailHtml(
      { oneDayOrders, threeDayOrders, sevenDayOrders },
      digestDate,
      formatDateForDigest
    );
    
    await sendEmail({
      to: recipientEmails,
      subject: `📦 Daily Delivery Digest - ${digestDate}`,
      html: emailHtml
    });
    
    // Mark orders as sent in a transaction-like manner
    const oneDayIds = oneDayOrders.map(o => o.id);
    const threeDayIds = threeDayOrders.map(o => o.id);
    const sevenDayIds = sevenDayOrders.map(o => o.id);
    
    await markOrdersAsSent(oneDayIds, '1d');
    await markOrdersAsSent(threeDayIds, '3d');
    await markOrdersAsSent(sevenDayIds, '7d');
    
    // Mark digest as sent
    await upsertDigestRun(digestDate, 'sent');
    
    logger.info('Daily digest completed successfully', {
      digestDate,
      recipientCount: recipientEmails.length,
      orderCount: oneDayOrders.length + threeDayOrders.length + sevenDayOrders.length
    });
    
    return {
      status: 'sent',
      digestDate,
      orderCounts: {
        oneDay: oneDayOrders.length,
        threeDay: threeDayOrders.length,
        sevenDay: sevenDayOrders.length
      }
    };
  } catch (error) {
    logger.error('Daily digest failed', error);
    await upsertDigestRun(digestDate, 'failed', error.message);
    throw error;
  }
}
