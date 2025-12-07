const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Item = require('../models/Item');
const { createLogger } = require('../utils/logger');
const {
  VALID_ORDER_STATUSES,
  VALID_PAYMENT_STATUSES,
  VALID_CONFIRMATION_STATUSES,
  MAX_CUSTOMER_NOTES_LENGTH,
  PRIORITY_MIN,
  PRIORITY_MAX,
} = require('../constants/orderConstants');

const logger = createLogger('OrdersRoute');
const ALLOWED_LIMITS = new Set([10, 20, 50]);

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

async function buildOrderItemsList(items) {
  const orderItems = [];
  let totalPrice = 0;

  for (const orderItem of items) {
    const item = await Item.findById(orderItem.itemId);
    if (!item) {
      return { valid: false, error: `Item with id ${orderItem.itemId} not found` };
    }
    
    const quantity = Number.parseInt(orderItem.quantity, 10);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { valid: false, error: 'Quantity must be a positive integer' };
    }

    orderItems.push({
      item: item._id,
      name: item.name,
      price: item.price,
      quantity: quantity,
      customizationRequest: orderItem.customizationRequest || ''
    });

    totalPrice += item.price * quantity;
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

router.get('/', async (req, res) => {
  try {
    const parsedPage = Number.parseInt(req.query.page, 10);
    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const limit = ALLOWED_LIMITS.has(parsedLimit) ? parsedLimit : 10;
    
    if (req.query.page || req.query.limit) {
      const result = await Order.findPaginated({ page, limit });
      res.json(result);
    } else {
      const orders = await Order.find();
      res.json(orders);
    }
  } catch (error) {
    logger.error('Failed to fetch orders', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { orderFrom, customerName, customerId, items, expectedDeliveryDate, paymentStatus, paidAmount, confirmationStatus, customerNotes, priority } = req.body;

    // Validate customer notes
    const notesValidation = validateCustomerNotes(customerNotes);
    if (!notesValidation.valid) {
      return res.status(400).json({ message: notesValidation.error });
    }

    // Validate required fields
    const fieldsValidation = validateRequiredFields(orderFrom, customerName, customerId, items);
    if (!fieldsValidation.valid) {
      return res.status(400).json({ message: fieldsValidation.error });
    }

    // Validate delivery date
    const dateValidation = validateDeliveryDate(expectedDeliveryDate);
    if (!dateValidation.valid) {
      return res.status(400).json({ message: dateValidation.error });
    }

    // Validate confirmation status
    const confirmationValidation = validateConfirmationStatus(confirmationStatus);
    if (!confirmationValidation.valid) {
      return res.status(400).json({ message: confirmationValidation.error });
    }

    // Validate priority
    const priorityValidation = validatePriority(priority);
    if (!priorityValidation.valid) {
      return res.status(400).json({ message: priorityValidation.error });
    }

    // Process order items
    const itemsResult = await processOrderItems(items);
    if (!itemsResult.valid) {
      return res.status(400).json({ message: itemsResult.error });
    }

    // Validate payment data
    const paymentValidation = validatePaymentData(paymentStatus, paidAmount, itemsResult.totalPrice);
    if (!paymentValidation.valid) {
      return res.status(400).json({ message: paymentValidation.error });
    }

    const newOrder = await Order.create({
      orderFrom,
      customerName,
      customerId,
      items: itemsResult.orderItems,
      totalPrice: itemsResult.totalPrice,
      expectedDeliveryDate: dateValidation.parsedDate,
      paymentStatus: paymentStatus || 'unpaid',
      paidAmount: paymentValidation.parsedAmount,
      confirmationStatus: confirmationStatus || 'unconfirmed',
      customerNotes: customerNotes || '',
      priority: priorityValidation.parsedPriority
    });

    logger.info('Order created', { orderId: newOrder.orderId, totalPrice: newOrder.totalPrice });
    res.status(201).json(newOrder);
  } catch (error) {
    logger.error('Failed to create order', error);
    res.status(500).json({ message: 'Failed to create order' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    logger.error('Failed to fetch order', error);
    res.status(500).json({ message: 'Failed to fetch order' });
  }
});

/**
 * Validates all fields required for updating an order
 * @param {Object} requestBody - The request body containing order update fields
 * @returns {Promise<Object>} - Returns {valid: true, data: {...}} on success or {valid: false, error: string} on failure
 */
async function validateUpdateRequest(requestBody) {
  const { customerName, customerId, items, expectedDeliveryDate, status, paymentStatus, paidAmount, confirmationStatus, customerNotes, priority } = requestBody;

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

  const paidAmountResult = parseUpdatePaidAmount(paidAmount);
  if (!paidAmountResult.valid) return paidAmountResult;

  const priorityResult = parseUpdatePriority(priority);
  if (!priorityResult.valid) return priorityResult;

  const dateResult = parseUpdateDeliveryDate(expectedDeliveryDate);
  if (!dateResult.valid) return dateResult;

  const itemsResult = await processUpdateOrderItems(items);
  if (!itemsResult.valid) return itemsResult;

  return { 
    valid: true, 
    data: { 
      paidAmountResult, 
      priorityResult, 
      dateResult, 
      itemsResult, 
      paymentStatus
    } 
  };
}

/**
 * Builds the update data object from validated request data
 * @param {Object} validationData - The validated data from validateUpdateRequest
 * @param {Object} requestBody - The original request body
 * @returns {Object} - The update data object with only defined fields
 */
function buildUpdateData(validationData, requestBody) {
  const { orderFrom, customerName, customerId, status, paymentStatus, confirmationStatus, customerNotes } = requestBody;
  const { paidAmountResult, priorityResult, dateResult, itemsResult } = validationData;
  
  const updateData = {};
  if (orderFrom !== undefined) updateData.orderFrom = orderFrom;
  if (customerName !== undefined) updateData.customerName = customerName;
  if (customerId !== undefined) updateData.customerId = customerId;
  if (dateResult.parsedDate !== undefined) updateData.expectedDeliveryDate = dateResult.parsedDate;
  if (status !== undefined) updateData.status = status;
  if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
  if (paidAmountResult.parsedAmount !== undefined) updateData.paidAmount = paidAmountResult.parsedAmount;
  if (confirmationStatus !== undefined) updateData.confirmationStatus = confirmationStatus;
  if (customerNotes !== undefined) updateData.customerNotes = customerNotes;
  if (priorityResult.parsedPriority !== undefined) updateData.priority = priorityResult.parsedPriority;
  if (itemsResult.orderItems !== undefined) updateData.items = itemsResult.orderItems;
  if (itemsResult.totalPrice !== undefined) updateData.totalPrice = itemsResult.totalPrice;
  
  return updateData;
}

router.put('/:id', async (req, res) => {
  try {
    const validation = await validateUpdateRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.error });
    }

    const { paidAmountResult, itemsResult, paymentStatus } = validation.data;
    
    // Validate payment amount against total price if needed
    if (paidAmountResult.parsedAmount !== undefined) {
      const existingOrder = await Order.findById(req.params.id);
      if (!existingOrder) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      const paymentValidation = validateUpdatePaymentAmount(
        paidAmountResult.parsedAmount, 
        itemsResult.totalPrice, 
        existingOrder.totalPrice, 
        paymentStatus
      );
      if (!paymentValidation.valid) {
        return res.status(400).json({ message: paymentValidation.error });
      }
    }

    const updateData = buildUpdateData(validation.data, req.body);
    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, updateData);
    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    logger.info('Order updated', { orderId: updatedOrder.orderId, id: req.params.id });
    res.json(updatedOrder);
  } catch (error) {
    logger.error('Failed to update order', error);
    res.status(500).json({ message: 'Failed to update order' });
  }
});

module.exports = router;
