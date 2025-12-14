import express from 'express';
const router = express.Router();
import Order from '../models/Order.js';
import Item from '../models/Item.js';
import { createLogger } from '../utils/logger.js';
import { asyncHandler, badRequestError, notFoundError } from '../utils/errorHandler.js';
import { parsePaginationParams } from '../utils/pagination.js';
import { cacheMiddleware, invalidateOrderCache } from '../middleware/cache.js';
import { upsertOrderReminderState } from '../services/digestService.js';
import {
  VALID_ORDER_STATUSES,
  VALID_PAYMENT_STATUSES,
  VALID_CONFIRMATION_STATUSES,
  VALID_DELIVERY_STATUSES,
  MAX_CUSTOMER_NOTES_LENGTH,
  PRIORITY_MIN,
  PRIORITY_MAX,
} from '../constants/orderConstants.js';

const logger = createLogger('OrdersRoute');

function validateCustomerNotes(customerNotes) {
  if (customerNotes && typeof customerNotes === 'string' && customerNotes.length > MAX_CUSTOMER_NOTES_LENGTH) {
    return { valid: false, error: `Customer notes cannot exceed ${MAX_CUSTOMER_NOTES_LENGTH} characters` };
  }
  return { valid: true };
}

function validateRequiredFields(orderFrom, customerName, customerId, items) {
  if (!orderFrom || !customerName || !customerId) {
    return { valid: false, error: 'Order source, customer name, and customer ID are required' };
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { valid: false, error: 'At least one item is required' };
  }
  return { valid: true };
}

function validateDeliveryDate(expectedDeliveryDate) {
  if (!expectedDeliveryDate) {
    return { valid: true, parsedDate: null };
  }
  
  const parsedDeliveryDate = new Date(expectedDeliveryDate);
  if (Number.isNaN(parsedDeliveryDate.getTime())) {
    return { valid: false, error: 'Invalid expected delivery date' };
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deliveryDate = new Date(parsedDeliveryDate);
  deliveryDate.setHours(0, 0, 0, 0);
  
  if (deliveryDate < today) {
    return { valid: false, error: 'Expected delivery date cannot be in the past' };
  }
  
  return { valid: true, parsedDate: parsedDeliveryDate };
}

function validatePaymentData(paymentStatus, paidAmount, totalPrice) {
  if (paymentStatus && !VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
    return { valid: false, error: `Invalid payment status. Must be one of: ${VALID_PAYMENT_STATUSES.join(', ')}` };
  }

  let parsedPaidAmount = 0;
  if (paidAmount !== undefined && paidAmount !== null) {
    parsedPaidAmount = Number.parseFloat(paidAmount);
    if (Number.isNaN(parsedPaidAmount) || parsedPaidAmount < 0) {
      return { valid: false, error: 'Paid amount must be a valid non-negative number' };
    }
  }

  if (parsedPaidAmount > totalPrice) {
    return { valid: false, error: 'Paid amount cannot exceed total price' };
  }
  
  if (paymentStatus === 'partially_paid' && (parsedPaidAmount === 0 || parsedPaidAmount >= totalPrice)) {
    return { 
      valid: false, 
      error: 'Partially paid orders must have a paid amount greater than 0 and less than the total price' 
    };
  }

  return { valid: true, parsedAmount: parsedPaidAmount };
}

function validatePriority(priority) {
  if (priority === undefined || priority === null) {
    return { valid: true, parsedPriority: 0 };
  }
  
  const parsedPriority = Number.parseInt(priority, 10);
  if (Number.isNaN(parsedPriority) || parsedPriority < PRIORITY_MIN || parsedPriority > PRIORITY_MAX) {
    return { valid: false, error: `Priority must be a number between ${PRIORITY_MIN} and ${PRIORITY_MAX}` };
  }
  
  return { valid: true, parsedPriority };
}

function validateConfirmationStatus(confirmationStatus) {
  if (confirmationStatus && !VALID_CONFIRMATION_STATUSES.includes(confirmationStatus)) {
    return { valid: false, error: `Invalid confirmation status. Must be one of: ${VALID_CONFIRMATION_STATUSES.join(', ')}` };
  }
  return { valid: true };
}

function validateDeliveryStatus(deliveryStatus) {
  if (deliveryStatus && !VALID_DELIVERY_STATUSES.includes(deliveryStatus)) {
    return { valid: false, error: `Invalid delivery status. Must be one of: ${VALID_DELIVERY_STATUSES.join(', ')}` };
  }
  return { valid: true };
}

function validateUpdateDeliveryStatus(deliveryStatus) {
  if (deliveryStatus !== undefined && !VALID_DELIVERY_STATUSES.includes(deliveryStatus)) {
    return { valid: false, error: `Invalid delivery status. Must be one of: ${VALID_DELIVERY_STATUSES.join(', ')}` };
  }
  return { valid: true };
}

function validateActualDeliveryDate(actualDeliveryDate) {
  if (!actualDeliveryDate) {
    return { valid: true, parsedDate: null };
  }
  
  const parsedDate = new Date(actualDeliveryDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return { valid: false, error: 'Invalid actual delivery date' };
  }
  
  return { valid: true, parsedDate };
}

function parseUpdateActualDeliveryDate(actualDeliveryDate) {
  if (actualDeliveryDate === undefined) {
    return { valid: true, parsedDate: undefined };
  }
  
  if (actualDeliveryDate === null || actualDeliveryDate === '') {
    return { valid: true, parsedDate: null };
  }
  
  const parsedDate = new Date(actualDeliveryDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return { valid: false, error: 'Invalid actual delivery date' };
  }
  
  return { valid: true, parsedDate };
}

function validateUpdateCustomerNotes(customerNotes) {
  if (customerNotes !== undefined && typeof customerNotes === 'string' && customerNotes.length > MAX_CUSTOMER_NOTES_LENGTH) {
    return { valid: false, error: `Customer notes cannot exceed ${MAX_CUSTOMER_NOTES_LENGTH} characters` };
  }
  return { valid: true };
}

function validateUpdateFields(customerName, customerId) {
  if (customerName !== undefined && !customerName?.trim()) {
    return { valid: false, error: 'Customer name cannot be empty' };
  }
  if (customerId !== undefined && !customerId?.trim()) {
    return { valid: false, error: 'Customer ID cannot be empty' };
  }
  return { valid: true };
}

function validateOrderStatus(status) {
  if (status !== undefined && !VALID_ORDER_STATUSES.includes(status)) {
    return { valid: false, error: `Invalid status. Must be one of: ${VALID_ORDER_STATUSES.join(', ')}` };
  }
  return { valid: true };
}

function validateUpdatePaymentStatus(paymentStatus) {
  if (paymentStatus !== undefined && !VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
    return { valid: false, error: `Invalid payment status. Must be one of: ${VALID_PAYMENT_STATUSES.join(', ')}` };
  }
  return { valid: true };
}

function validateUpdateConfirmationStatus(confirmationStatus) {
  if (confirmationStatus !== undefined && !VALID_CONFIRMATION_STATUSES.includes(confirmationStatus)) {
    return { valid: false, error: `Invalid confirmation status. Must be one of: ${VALID_CONFIRMATION_STATUSES.join(', ')}` };
  }
  return { valid: true };
}

function parseUpdatePaidAmount(paidAmount) {
  if (paidAmount === undefined) {
    return { valid: true, parsedAmount: undefined };
  }
  
  const parsedPaidAmount = Number.parseFloat(paidAmount);
  if (Number.isNaN(parsedPaidAmount) || parsedPaidAmount < 0) {
    return { valid: false, error: 'Paid amount must be a valid non-negative number' };
  }
  
  return { valid: true, parsedAmount: parsedPaidAmount };
}

function parseUpdatePriority(priority) {
  if (priority === undefined) {
    return { valid: true, parsedPriority: undefined };
  }
  
  const parsedPriority = Number.parseInt(priority, 10);
  if (Number.isNaN(parsedPriority) || parsedPriority < PRIORITY_MIN || parsedPriority > PRIORITY_MAX) {
    return { valid: false, error: `Priority must be a number between ${PRIORITY_MIN} and ${PRIORITY_MAX}` };
  }
  
  return { valid: true, parsedPriority };
}

function parseUpdateDeliveryDate(expectedDeliveryDate) {
  if (expectedDeliveryDate === undefined) {
    return { valid: true, parsedDate: undefined };
  }
  
  if (expectedDeliveryDate === null || expectedDeliveryDate === '') {
    return { valid: true, parsedDate: null };
  }
  
  const parsedDeliveryDate = new Date(expectedDeliveryDate);
  if (Number.isNaN(parsedDeliveryDate.getTime())) {
    return { valid: false, error: 'Invalid expected delivery date' };
  }
  
  return { valid: true, parsedDate: parsedDeliveryDate };
}

function validateUpdatePaymentAmount(parsedPaidAmount, totalPrice, existingTotalPrice, paymentStatus) {
  if (parsedPaidAmount === undefined) {
    return { valid: true };
  }
  
  const effectiveTotalPrice = totalPrice !== undefined ? totalPrice : existingTotalPrice;
  
  if (parsedPaidAmount > effectiveTotalPrice) {
    return { valid: false, error: 'Paid amount cannot exceed total price' };
  }
  
  if (paymentStatus === 'partially_paid' && (parsedPaidAmount <= 0 || parsedPaidAmount >= effectiveTotalPrice)) {
    return { 
      valid: false, 
      error: "For 'partially_paid' status, paid amount must be greater than 0 and less than total price" 
    };
  }
  
  return { valid: true };
}

/**
 * Build order items list with bulk fetch to avoid N+1 query problem
 * Fetches all items in a single DB query instead of N individual queries
 * @param {Array} items - Array of order items with itemId and quantity
 * @returns {Promise<{valid: boolean, orderItems?: Array, totalPrice?: number, error?: string}>}
 */
async function buildOrderItemsList(items) {
  // Parse and validate quantities first (no DB needed)
  const parsedItems = [];
  for (const orderItem of items) {
    const quantity = Number.parseInt(orderItem.quantity, 10);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { valid: false, error: 'Quantity must be a positive integer' };
    }
    parsedItems.push({
      itemId: orderItem.itemId,
      quantity,
      customizationRequest: orderItem.customizationRequest || ''
    });
  }

  // Bulk fetch all items in a single query (fixes N+1 problem)
  const itemIds = parsedItems.map(i => i.itemId);
  const itemsMap = await Item.findByIds(itemIds);
  
  const orderItems = [];
  let totalPrice = 0;

  for (const parsedItem of parsedItems) {
    const item = itemsMap.get(Number.parseInt(parsedItem.itemId, 10));
    if (!item) {
      return { valid: false, error: `Item with id ${parsedItem.itemId} not found` };
    }

    orderItems.push({
      item: item._id,
      name: item.name,
      price: item.price,
      quantity: parsedItem.quantity,
      customizationRequest: parsedItem.customizationRequest
    });

    totalPrice += item.price * parsedItem.quantity;
  }

  return { valid: true, orderItems, totalPrice };
}

async function processOrderItems(items) {
  return buildOrderItemsList(items);
}

async function processUpdateOrderItems(items) {
  if (items === undefined) {
    return { valid: true, orderItems: undefined, totalPrice: undefined };
  }
  
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, error: 'At least one item is required' };
  }

  return buildOrderItemsList(items);
}

router.get('/priority', cacheMiddleware(300), asyncHandler(async (req, res) => {
  const priorityOrders = await Order.findPriorityOrders();
  res.json(priorityOrders);
}));

// Get all orders without pagination - this is the source of truth
router.get('/all', cacheMiddleware(86400), asyncHandler(async (req, res) => {
  const orders = await Order.find();
  res.json(orders);
}));

// Get orders with pagination
router.get('/', asyncHandler(async (req, res) => {
  const { page, limit } = parsePaginationParams(req.query);
  
  // Use DB-level pagination for optimal performance (O(1) vs O(N) memory)
  const result = await Order.findPaginated({ page, limit });
  
  res.json(result);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { orderFrom, customerName, customerId, address, orderDate, items, expectedDeliveryDate, paymentStatus, paidAmount, confirmationStatus, customerNotes, priority, deliveryStatus, trackingId, deliveryPartner, actualDeliveryDate } = req.body;

  // Validate customer notes
  const notesValidation = validateCustomerNotes(customerNotes);
  if (!notesValidation.valid) {
    throw badRequestError(notesValidation.error);
  }

  // Validate required fields
  const fieldsValidation = validateRequiredFields(orderFrom, customerName, customerId, items);
  if (!fieldsValidation.valid) {
    throw badRequestError(fieldsValidation.error);
  }

  // Validate delivery date
  const dateValidation = validateDeliveryDate(expectedDeliveryDate);
  if (!dateValidation.valid) {
    throw badRequestError(dateValidation.error);
  }

  // Validate confirmation status
  const confirmationValidation = validateConfirmationStatus(confirmationStatus);
  if (!confirmationValidation.valid) {
    throw badRequestError(confirmationValidation.error);
  }

  // Validate priority
  const priorityValidation = validatePriority(priority);
  if (!priorityValidation.valid) {
    throw badRequestError(priorityValidation.error);
  }

  // Validate delivery status
  const deliveryStatusValidation = validateDeliveryStatus(deliveryStatus);
  if (!deliveryStatusValidation.valid) {
    throw badRequestError(deliveryStatusValidation.error);
  }

  // Validate actual delivery date
  const actualDeliveryDateValidation = validateActualDeliveryDate(actualDeliveryDate);
  if (!actualDeliveryDateValidation.valid) {
    throw badRequestError(actualDeliveryDateValidation.error);
  }

  // Process order items
  const itemsResult = await processOrderItems(items);
  if (!itemsResult.valid) {
    throw badRequestError(itemsResult.error);
  }

  // Validate payment data
  const paymentValidation = validatePaymentData(paymentStatus, paidAmount, itemsResult.totalPrice);
  if (!paymentValidation.valid) {
    throw badRequestError(paymentValidation.error);
  }

  // Proactively invalidate cache BEFORE creating order to prevent race conditions
  await invalidateOrderCache();

  const newOrder = await Order.create({
    orderFrom,
    customerName,
    customerId,
    address,
    orderDate,
    items: itemsResult.orderItems,
    totalPrice: itemsResult.totalPrice,
    expectedDeliveryDate: dateValidation.parsedDate,
    paymentStatus: paymentStatus || 'unpaid',
    paidAmount: paymentValidation.parsedAmount,
    confirmationStatus: confirmationStatus || 'unconfirmed',
    customerNotes: customerNotes || '',
    priority: priorityValidation.parsedPriority,
    deliveryStatus: deliveryStatus || 'not_shipped',
    trackingId: trackingId || '',
    deliveryPartner: deliveryPartner || '',
    actualDeliveryDate: actualDeliveryDateValidation.parsedDate
  });

  // Invalidate order cache again after creating to ensure consistency
  await invalidateOrderCache();

  // Initialize reminder state if expectedDeliveryDate is set
  if (newOrder.expectedDeliveryDate) {
    try {
      await upsertOrderReminderState(newOrder._id, new Date(newOrder.expectedDeliveryDate));
    } catch (err) {
      logger.warn('Failed to initialize reminder state', { orderId: newOrder.orderId, error: err.message });
    }
  }

  logger.info('Order created', { orderId: newOrder.orderId, totalPrice: newOrder.totalPrice });
  res.status(201).json(newOrder);
}));

router.get('/:id', cacheMiddleware(86400), asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    throw notFoundError('Order');
  }
  res.json(order);
}));

/**
 * Validates all fields required for updating an order
 * @param {Object} requestBody - The request body containing order update fields
 * @returns {Promise<Object>} - Returns {valid: true, data: {...}} on success or {valid: false, error: string} on failure
 */
async function validateUpdateRequest(requestBody) {
  const { customerName, customerId, items, expectedDeliveryDate, status, paymentStatus, paidAmount, confirmationStatus, customerNotes, priority, deliveryStatus, actualDeliveryDate } = requestBody;

  const notesValidation = validateUpdateCustomerNotes(customerNotes);
  if (!notesValidation.valid) return notesValidation;

  const fieldsValidation = validateUpdateFields(customerName, customerId);
  if (!fieldsValidation.valid) return fieldsValidation;

  const statusValidation = validateOrderStatus(status);
  if (!statusValidation.valid) return statusValidation;

  const paymentStatusValidation = validateUpdatePaymentStatus(paymentStatus);
  if (!paymentStatusValidation.valid) return paymentStatusValidation;

  const confirmationValidation = validateUpdateConfirmationStatus(confirmationStatus);
  if (!confirmationValidation.valid) return confirmationValidation;

  const deliveryStatusValidation = validateUpdateDeliveryStatus(deliveryStatus);
  if (!deliveryStatusValidation.valid) return deliveryStatusValidation;

  const paidAmountResult = parseUpdatePaidAmount(paidAmount);
  if (!paidAmountResult.valid) return paidAmountResult;

  const priorityResult = parseUpdatePriority(priority);
  if (!priorityResult.valid) return priorityResult;

  const dateResult = parseUpdateDeliveryDate(expectedDeliveryDate);
  if (!dateResult.valid) return dateResult;

  const actualDeliveryDateResult = parseUpdateActualDeliveryDate(actualDeliveryDate);
  if (!actualDeliveryDateResult.valid) return actualDeliveryDateResult;

  const itemsResult = await processUpdateOrderItems(items);
  if (!itemsResult.valid) return itemsResult;

  return { 
    valid: true, 
    data: { 
      paidAmountResult, 
      priorityResult, 
      dateResult, 
      actualDeliveryDateResult,
      itemsResult, 
      paymentStatus
    } 
  };
}

/**
 * Adds a field to update data if it's defined
 * @param {Object} target - The target object to update
 * @param {string} key - The key to set
 * @param {*} value - The value to set
 */
function addIfDefined(target, key, value) {
  if (value !== undefined) {
    target[key] = value;
  }
}

/**
 * Builds the update data object from validated request data
 * @param {Object} validationData - The validated data from validateUpdateRequest
 * @param {Object} requestBody - The original request body
 * @returns {Object} - The update data object with only defined fields
 */
function buildUpdateData(validationData, requestBody) {
  const { orderFrom, customerName, customerId, address, orderDate, status, paymentStatus, confirmationStatus, customerNotes, deliveryStatus, trackingId, deliveryPartner } = requestBody;
  const { paidAmountResult, priorityResult, dateResult, actualDeliveryDateResult, itemsResult } = validationData;
  
  const updateData = {};
  
  // Direct fields from request body
  const directFields = [
    ['orderFrom', orderFrom],
    ['customerName', customerName],
    ['customerId', customerId],
    ['address', address],
    ['orderDate', orderDate],
    ['status', status],
    ['paymentStatus', paymentStatus],
    ['confirmationStatus', confirmationStatus],
    ['customerNotes', customerNotes],
    ['deliveryStatus', deliveryStatus],
    ['trackingId', trackingId],
    ['deliveryPartner', deliveryPartner]
  ];
  
  directFields.forEach(([key, value]) => addIfDefined(updateData, key, value));
  
  // Parsed fields from validation results
  addIfDefined(updateData, 'expectedDeliveryDate', dateResult.parsedDate);
  addIfDefined(updateData, 'paidAmount', paidAmountResult.parsedAmount);
  addIfDefined(updateData, 'priority', priorityResult.parsedPriority);
  addIfDefined(updateData, 'actualDeliveryDate', actualDeliveryDateResult.parsedDate);
  addIfDefined(updateData, 'items', itemsResult.orderItems);
  addIfDefined(updateData, 'totalPrice', itemsResult.totalPrice);
  
  return updateData;
}

router.put('/:id', asyncHandler(async (req, res) => {
  const validation = await validateUpdateRequest(req.body);
  if (!validation.valid) {
    throw badRequestError(validation.error);
  }

  const { paidAmountResult, itemsResult, paymentStatus, dateResult } = validation.data;
  
  // Fetch the existing order for validation and comparison
  const existingOrder = await Order.findById(req.params.id);
  if (!existingOrder) {
    throw notFoundError('Order');
  }
  
  // Validate payment amount against total price if needed
  if (paidAmountResult.parsedAmount !== undefined) {
    const paymentValidation = validateUpdatePaymentAmount(
      paidAmountResult.parsedAmount, 
      itemsResult.totalPrice, 
      existingOrder.totalPrice, 
      paymentStatus
    );
    if (!paymentValidation.valid) {
      throw badRequestError(paymentValidation.error);
    }
  }

  const updateData = buildUpdateData(validation.data, req.body);
  
  // Proactively invalidate cache BEFORE updating to prevent race conditions
  await invalidateOrderCache();
  
  const updatedOrder = await Order.findByIdAndUpdate(req.params.id, updateData);
  if (!updatedOrder) {
    throw notFoundError('Order');
  }

  // Invalidate order cache again after updating to ensure consistency
  await invalidateOrderCache();

  // Update reminder state if expectedDeliveryDate changed
  if (dateResult.parsedDate !== undefined) {
    const oldDate = existingOrder.expectedDeliveryDate ? new Date(existingOrder.expectedDeliveryDate) : null;
    const newDate = dateResult.parsedDate;
    
    // Only update if the date actually changed
    const dateChanged = (oldDate === null && newDate !== null) ||
                        (oldDate !== null && newDate === null) ||
                        (oldDate !== null && newDate !== null && oldDate.getTime() !== newDate.getTime());
    
    if (dateChanged && newDate) {
      try {
        await upsertOrderReminderState(updatedOrder._id, newDate);
      } catch (err) {
        logger.warn('Failed to update reminder state', { orderId: updatedOrder.orderId, error: err.message });
      }
    }
  }

  logger.info('Order updated', { orderId: updatedOrder.orderId, id: req.params.id });
  res.json(updatedOrder);
}));

export default router;
