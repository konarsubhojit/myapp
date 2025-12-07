const { eq, desc, sql, asc } = require('drizzle-orm');
const { getDatabase } = require('../db/connection');
const { orders, orderItems } = require('../db/schema');

function generateOrderId() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `ORD${randomNum}`;
}

function transformOrderItem(item) {
  return {
    ...item,
    _id: item.id,
    item: item.itemId,
    price: Number.parseFloat(item.price),
    customizationRequest: item.customizationRequest || ''
  };
}

function transformOrder(order, items = []) {
  return {
    ...order,
    _id: order.id,
    totalPrice: Number.parseFloat(order.totalPrice),
    paidAmount: Number.parseFloat(order.paidAmount || 0),
    status: order.status || 'pending',
    paymentStatus: order.paymentStatus || 'unpaid',
    confirmationStatus: order.confirmationStatus || 'unconfirmed',
    customerNotes: order.customerNotes || '',
    address: order.address || '',
    priority: order.priority || 0,
    orderDate: order.orderDate ? order.orderDate.toISOString() : null,
    expectedDeliveryDate: order.expectedDeliveryDate ? order.expectedDeliveryDate.toISOString() : null,
    items: items.map(transformOrderItem)
  };
}

function buildOrderUpdateData(data) {
  const updateData = {};
  if (data.orderFrom !== undefined) updateData.orderFrom = data.orderFrom;
  if (data.customerName !== undefined) updateData.customerName = data.customerName.trim();
  if (data.customerId !== undefined) updateData.customerId = data.customerId.trim();
  if (data.address !== undefined) updateData.address = data.address?.trim() || null;
  if (data.totalPrice !== undefined) updateData.totalPrice = data.totalPrice.toString();
  if (data.orderDate !== undefined) {
    updateData.orderDate = data.orderDate ? new Date(data.orderDate) : null;
  }
  if (data.expectedDeliveryDate !== undefined) {
    updateData.expectedDeliveryDate = data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null;
  }
  if (data.status !== undefined) updateData.status = data.status;
  if (data.paymentStatus !== undefined) updateData.paymentStatus = data.paymentStatus;
  if (data.paidAmount !== undefined) updateData.paidAmount = data.paidAmount.toString();
  if (data.confirmationStatus !== undefined) updateData.confirmationStatus = data.confirmationStatus;
  if (data.customerNotes !== undefined) updateData.customerNotes = data.customerNotes?.trim() || null;
  if (data.priority !== undefined) updateData.priority = data.priority;
  return updateData;
}

async function updateOrderItems(db, orderId, items) {
  await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
  
  if (items.length > 0) {
    const orderItemsData = items.map(item => ({
      orderId: orderId,
      itemId: item.item,
      name: item.name,
      price: item.price.toString(),
      quantity: item.quantity,
      customizationRequest: item.customizationRequest?.trim() || null
    }));
    
    await db.insert(orderItems).values(orderItemsData);
  }
}

const Order = {
  async find() {
    const db = getDatabase();
    const ordersResult = await db.select().from(orders).orderBy(desc(orders.createdAt));
    
    const ordersWithItems = await Promise.all(
      ordersResult.map(async (order) => {
        const itemsResult = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        return transformOrder(order, itemsResult);
      })
    );
    
    return ordersWithItems;
  },

  async findPaginated({ page = 1, limit = 10 }) {
    const db = getDatabase();
    const offset = (page - 1) * limit;
    
    const countResult = await db.select({ count: sql`count(*)` }).from(orders);
    const total = Number.parseInt(countResult[0].count, 10);
    
    const ordersResult = await db.select()
      .from(orders)
      .orderBy(
        sql`${orders.expectedDeliveryDate} IS NULL`,
        asc(orders.expectedDeliveryDate),
        desc(orders.createdAt)
      )
      .limit(limit)
      .offset(offset);
    
    const ordersWithItems = await Promise.all(
      ordersResult.map(async (order) => {
        const itemsResult = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        return transformOrder(order, itemsResult);
      })
    );
    
    return {
      orders: ordersWithItems,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  },

  async findById(id) {
    const db = getDatabase();
    const numericId = Number.parseInt(id, 10);
    if (Number.isNaN(numericId)) return null;
    
    const ordersResult = await db.select().from(orders).where(eq(orders.id, numericId));
    if (ordersResult.length === 0) return null;
    
    const order = ordersResult[0];
    const itemsResult = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    
    return transformOrder(order, itemsResult);
  },

  async findPriorityOrders() {
    const db = getDatabase();
    const now = new Date();
    
    // Get orders that need attention:
    // 1. High priority (priority >= 5) AND not completed/cancelled
    // 2. Delivery date within next 3 days AND not completed/cancelled
    // 3. Overdue (delivery date in the past) AND not completed/cancelled
    const ordersResult = await db.select()
      .from(orders)
      .where(
        sql`(
          (${orders.priority} >= 5 OR
          (${orders.expectedDeliveryDate} IS NOT NULL AND ${orders.expectedDeliveryDate} <= ${new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)}) OR
          (${orders.expectedDeliveryDate} IS NOT NULL AND ${orders.expectedDeliveryDate} < ${now}))
          AND ${orders.status} NOT IN ('completed', 'cancelled')
        )`
      )
      .orderBy(
        sql`CASE 
          WHEN ${orders.expectedDeliveryDate} IS NOT NULL AND ${orders.expectedDeliveryDate} < ${now} THEN 1
          WHEN ${orders.expectedDeliveryDate} IS NOT NULL AND ${orders.expectedDeliveryDate} <= ${new Date(now.getTime() + 24 * 60 * 60 * 1000)} THEN 2
          WHEN ${orders.priority} >= 8 THEN 3
          WHEN ${orders.expectedDeliveryDate} IS NOT NULL AND ${orders.expectedDeliveryDate} <= ${new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)} THEN 4
          WHEN ${orders.priority} >= 5 THEN 5
          ELSE 6
        END`,
        asc(orders.expectedDeliveryDate),
        desc(orders.priority)
      );
    
    const ordersWithItems = await Promise.all(
      ordersResult.map(async (order) => {
        const itemsResult = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        return transformOrder(order, itemsResult);
      })
    );
    
    return ordersWithItems;
  },

  async create(data) {
    const db = getDatabase();
    const orderId = generateOrderId();
    
    const orderResult = await db.insert(orders).values({
      orderId: orderId,
      orderFrom: data.orderFrom,
      customerName: data.customerName.trim(),
      customerId: data.customerId.trim(),
      address: data.address?.trim() || null,
      totalPrice: data.totalPrice.toString(),
      paidAmount: (data.paidAmount || 0).toString(),
      paymentStatus: data.paymentStatus || 'unpaid',
      confirmationStatus: data.confirmationStatus || 'unconfirmed',
      customerNotes: data.customerNotes?.trim() || null,
      priority: data.priority || 0,
      orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
      expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null
    }).returning();
    
    const newOrder = orderResult[0];
    
    const orderItemsData = data.items.map(item => ({
      orderId: newOrder.id,
      itemId: item.item,
      name: item.name,
      price: item.price.toString(),
      quantity: item.quantity,
      customizationRequest: item.customizationRequest?.trim() || null
    }));
    
    const itemsResult = await db.insert(orderItems).values(orderItemsData).returning();
    
    return transformOrder(newOrder, itemsResult);
  },

  async findByIdAndUpdate(id, data) {
    const db = getDatabase();
    const numericId = Number.parseInt(id, 10);
    if (Number.isNaN(numericId)) return null;
    
    const existingOrder = await db.select().from(orders).where(eq(orders.id, numericId));
    if (existingOrder.length === 0) return null;
    
    const updateData = buildOrderUpdateData(data);
    
    if (Object.keys(updateData).length > 0) {
      await db.update(orders)
        .set(updateData)
        .where(eq(orders.id, numericId));
    }
    
    if (data.items && Array.isArray(data.items)) {
      await updateOrderItems(db, numericId, data.items);
    }
    
    return this.findById(numericId);
  }
};

module.exports = Order;
