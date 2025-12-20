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

function validateField(value, isValid, errorMessage) {
  if (value !== undefined && !isValid(value)) {
    return { valid: false, error: errorMessage };
  }
  return { valid: true };
}

function validateEnum(value, allowedValues, fieldName) {
  if (!value) {
    return { valid: true };
  }
  
  if (!allowedValues.includes(value)) {
    return { 
      valid: false, 
      error: `Invalid ${fieldName}. Must be one of: ${allowedValues.join(', ')}` 
    };
  }
  return { valid: true };
}

function validateCustomerNotes(customerNotes) {
  return validateField(
    customerNotes,
    notes => typeof notes === 'string' && notes.length <= MAX_CUSTOMER_NOTES_LENGTH,
    `Customer notes cannot exceed ${MAX_CUSTOMER_NOTES_LENGTH} characters`
  );
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
  const statusValidation = validateEnum(paymentStatus, VALID_PAYMENT_STATUSES, 'payment status');
  if (!statusValidation.valid) {
    return statusValidation;
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
  return validateEnum(confirmationStatus, VALID_CONFIRMATION_STATUSES, 'confirmation status');
}

function validateDeliveryStatus(deliveryStatus) {
  return validateEnum(deliveryStatus, VALID_DELIVERY_STATUSES, 'delivery status');
}

function validateUpdateDeliveryStatus(deliveryStatus) {
  if (deliveryStatus === undefined) {
    return { valid: true };
  }
  return validateEnum(deliveryStatus, VALID_DELIVERY_STATUSES, 'delivery status');
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
  if (status === undefined) {
    return { valid: true };
  }
  return validateEnum(status, VALID_ORDER_STATUSES, 'status');
}

function validateUpdatePaymentStatus(paymentStatus) {
  if (paymentStatus === undefined) {
    return { valid: true };
  }
  return validateEnum(paymentStatus, VALID_PAYMENT_STATUSES, 'payment status');
}

function validateUpdateConfirmationStatus(confirmationStatus) {
  if (confirmationStatus === undefined) {
    return { valid: true };
  }
  return validateEnum(confirmationStatus, VALID_CONFIRMATION_STATUSES, 'confirmation status');
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
  
  const effectiveTotalPrice = totalPrice === undefined ? existingTotalPrice : totalPrice;
  
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

async function buildOrderItemsList(items) {
  const parsedItems = [];
  for (const orderItem of items) {
    const quantity = Number.parseInt(orderItem.quantity, 10);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { valid: false, error: 'Quantity must be a positive integer' };
    }
    parsedItems.push({
      itemId: orderItem.itemId,
      designId: orderItem.designId,
      quantity,
      customizationRequest: orderItem.customizationRequest || ''
    });
  }

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
      designId: parsedItem.designId,
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

router.get('/all', cacheMiddleware(86400), asyncHandler(async (req, res) => {
  const orders = await Order.find();
  res.json(orders);
}));

router.get('/cursor', cacheMiddleware(60), asyncHandler(async (req, res) => {
  const { cursor, limit } = req.query;
  
  const parsedLimit = limit ? Number.parseInt(limit, 10) : 10;
  if (Number.isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    throw badRequestError('Limit must be a number between 1 and 100');
  }
  
  const result = await Order.findCursorPaginated({ 
    limit: parsedLimit, 
    cursor: cursor || null 
  });
  
  res.json(result);
}));

router.get('/', cacheMiddleware(60), asyncHandler(async (req, res) => {
  const { page, limit } = parsePaginationParams(req.query);
  
  const result = await Order.findPaginated({ page, limit });
  
  res.json(result);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { orderFrom, customerName, customerId, address, orderDate, items, expectedDeliveryDate, paymentStatus, paidAmount, confirmationStatus, customerNotes, priority, deliveryStatus, trackingId, deliveryPartner, actualDeliveryDate } = req.body;

  const notesValidation = validateCustomerNotes(customerNotes);
  if (!notesValidation.valid) {
    throw badRequestError(notesValidation.error);
  }

  const fieldsValidation = validateRequiredFields(orderFrom, customerName, customerId, items);
  if (!fieldsValidation.valid) {
    throw badRequestError(fieldsValidation.error);
  }

  const dateValidation = validateDeliveryDate(expectedDeliveryDate);
  if (!dateValidation.valid) {
    throw badRequestError(dateValidation.error);
  }

  const confirmationValidation = validateConfirmationStatus(confirmationStatus);
  if (!confirmationValidation.valid) {
    throw badRequestError(confirmationValidation.error);
  }

  const priorityValidation = validatePriority(priority);
  if (!priorityValidation.valid) {
    throw badRequestError(priorityValidation.error);
  }

  const deliveryStatusValidation = validateDeliveryStatus(deliveryStatus);
  if (!deliveryStatusValidation.valid) {
    throw badRequestError(deliveryStatusValidation.error);
  }

  const actualDeliveryDateValidation = validateActualDeliveryDate(actualDeliveryDate);
  if (!actualDeliveryDateValidation.valid) {
    throw badRequestError(actualDeliveryDateValidation.error);
  }

  const itemsResult = await processOrderItems(items);
  if (!itemsResult.valid) {
    throw badRequestError(itemsResult.error);
  }

  const paymentValidation = validatePaymentData(paymentStatus, paidAmount, itemsResult.totalPrice);
  if (!paymentValidation.valid) {
    throw badRequestError(paymentValidation.error);
  }

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

  // Invalidate cache after creation to bust stale data
  await invalidateOrderCache();

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

async function validateAllUpdateFields(requestBody) {
  const validations = [
    validateCustomerNotes(requestBody.customerNotes),
    validateUpdateFields(requestBody.customerName, requestBody.customerId),
    validateOrderStatus(requestBody.status),
    validateUpdatePaymentStatus(requestBody.paymentStatus),
    validateUpdateConfirmationStatus(requestBody.confirmationStatus),
    validateUpdateDeliveryStatus(requestBody.deliveryStatus),
    parseUpdatePaidAmount(requestBody.paidAmount),
    parseUpdatePriority(requestBody.priority),
    parseUpdateDeliveryDate(requestBody.expectedDeliveryDate),
    parseUpdateActualDeliveryDate(requestBody.actualDeliveryDate),
  ];
  
  for (const validation of validations) {
    if (!validation.valid) {
      return validation;
    }
  }
  
  const itemsResult = await processUpdateOrderItems(requestBody.items);
  if (!itemsResult.valid) {
    return itemsResult;
  }
  
  return { valid: true, itemsResult };
}

async function validateUpdateRequest(requestBody) {
  const { paidAmount, priority, expectedDeliveryDate, actualDeliveryDate, paymentStatus } = requestBody;

  const baseValidation = await validateAllUpdateFields(requestBody);
  if (!baseValidation.valid) {
    return baseValidation;
  }
  
  const paidAmountResult = parseUpdatePaidAmount(paidAmount);
  const priorityResult = parseUpdatePriority(priority);
  const dateResult = parseUpdateDeliveryDate(expectedDeliveryDate);
  const actualDeliveryDateResult = parseUpdateActualDeliveryDate(actualDeliveryDate);
  const itemsResult = baseValidation.itemsResult;

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

function addIfDefined(target, key, value) {
  if (value !== undefined) {
    target[key] = value;
  }
}

function buildUpdateData(validationData, requestBody) {
  const { orderFrom, customerName, customerId, address, orderDate, status, paymentStatus, confirmationStatus, customerNotes, deliveryStatus, trackingId, deliveryPartner } = requestBody;
  const { paidAmountResult, priorityResult, dateResult, actualDeliveryDateResult, itemsResult } = validationData;
  
  const updateData = {};
  
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
  
  addIfDefined(updateData, 'expectedDeliveryDate', dateResult.parsedDate);
  addIfDefined(updateData, 'paidAmount', paidAmountResult.parsedAmount);
  addIfDefined(updateData, 'priority', priorityResult.parsedPriority);
  addIfDefined(updateData, 'actualDeliveryDate', actualDeliveryDateResult.parsedDate);
  addIfDefined(updateData, 'items', itemsResult.orderItems);
  addIfDefined(updateData, 'totalPrice', itemsResult.totalPrice);
  
  return updateData;
}

function hasDeliveryDateChanged(oldDate, newDate) {
  if (oldDate === null && newDate !== null) return true;
  if (oldDate !== null && newDate === null) return true;
  if (oldDate !== null && newDate !== null && oldDate.getTime() !== newDate.getTime()) return true;
  return false;
}

async function updateReminderStateIfNeeded(existingOrder, dateResult, updatedOrder) {
  if (dateResult.parsedDate === undefined) {
    return;
  }
  
  const oldDate = existingOrder.expectedDeliveryDate ? new Date(existingOrder.expectedDeliveryDate) : null;
  const newDate = dateResult.parsedDate;
  
  if (hasDeliveryDateChanged(oldDate, newDate) && newDate) {
    try {
      await upsertOrderReminderState(updatedOrder._id, newDate);
    } catch (err) {
      logger.warn('Failed to update reminder state', { 
        orderId: updatedOrder.orderId, 
        error: err.message 
      });
    }
  }
}

async function validatePaymentAmountIfProvided(paidAmountResult, itemsResult, existingOrder, paymentStatus) {
  if (paidAmountResult.parsedAmount === undefined) {
    return;
  }
  
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

async function performOrderUpdate(orderId, updateData) {
  const updatedOrder = await Order.findByIdAndUpdate(orderId, updateData);
  if (!updatedOrder) {
    throw notFoundError('Order');
  }
  
  // Invalidate cache after update to bust stale data
  await invalidateOrderCache();
  
  return updatedOrder;
}

router.put('/:id', asyncHandler(async (req, res) => {
  const validation = await validateUpdateRequest(req.body);
  if (!validation.valid) {
    throw badRequestError(validation.error);
  }

  const { paidAmountResult, itemsResult, paymentStatus, dateResult } = validation.data;
  
  const existingOrder = await Order.findById(req.params.id);
  if (!existingOrder) {
    throw notFoundError('Order');
  }
  
  await validatePaymentAmountIfProvided(paidAmountResult, itemsResult, existingOrder, paymentStatus);

  const updateData = buildUpdateData(validation.data, req.body);
  const updatedOrder = await performOrderUpdate(req.params.id, updateData);
  await updateReminderStateIfNeeded(existingOrder, dateResult, updatedOrder);

  logger.info('Order updated', { orderId: updatedOrder.orderId, id: req.params.id });
  res.json(updatedOrder);
}));

export default router;
