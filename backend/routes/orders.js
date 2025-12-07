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

    if (customerNotes && typeof customerNotes === 'string' && customerNotes.length > MAX_CUSTOMER_NOTES_LENGTH) {
      return res.status(400).json({ message: `Customer notes cannot exceed ${MAX_CUSTOMER_NOTES_LENGTH} characters` });
    }
    if (!orderFrom || !customerName || !customerId) {
      return res.status(400).json({ message: 'Order source, customer name, and customer ID are required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    let parsedDeliveryDate = null;
    if (expectedDeliveryDate) {
      parsedDeliveryDate = new Date(expectedDeliveryDate);
      if (Number.isNaN(parsedDeliveryDate.getTime())) {
        return res.status(400).json({ message: 'Invalid expected delivery date' });
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deliveryDate = new Date(parsedDeliveryDate);
      deliveryDate.setHours(0, 0, 0, 0);
      
      if (deliveryDate < today) {
        return res.status(400).json({ message: 'Expected delivery date cannot be in the past' });
      }
    }

    if (paymentStatus && !VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
      return res.status(400).json({ message: `Invalid payment status. Must be one of: ${VALID_PAYMENT_STATUSES.join(', ')}` });
    }

    if (confirmationStatus && !VALID_CONFIRMATION_STATUSES.includes(confirmationStatus)) {
      return res.status(400).json({ message: `Invalid confirmation status. Must be one of: ${VALID_CONFIRMATION_STATUSES.join(', ')}` });
    }

    let parsedPaidAmount = 0;
    if (paidAmount !== undefined && paidAmount !== null) {
      parsedPaidAmount = Number.parseFloat(paidAmount);
      if (Number.isNaN(parsedPaidAmount) || parsedPaidAmount < 0) {
        return res.status(400).json({ message: 'Paid amount must be a valid non-negative number' });
      }
    }

    let parsedPriority = 0;
    if (priority !== undefined && priority !== null) {
      parsedPriority = Number.parseInt(priority, 10);
      if (Number.isNaN(parsedPriority) || parsedPriority < PRIORITY_MIN || parsedPriority > PRIORITY_MAX) {
        return res.status(400).json({ message: `Priority must be a number between ${PRIORITY_MIN} and ${PRIORITY_MAX}` });
      }
    }

    let totalPrice = 0;
    const orderItems = [];

    for (const orderItem of items) {
      const item = await Item.findById(orderItem.itemId);
      if (!item) {
        return res.status(400).json({ message: `Item with id ${orderItem.itemId} not found` });
      }
      
      const quantity = Number.parseInt(orderItem.quantity, 10);
      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ message: 'Quantity must be a positive integer' });
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

    if (parsedPaidAmount > totalPrice) {
      return res.status(400).json({ message: 'Paid amount cannot exceed total price' });
    }
    
    if (paymentStatus === 'partially_paid' && (parsedPaidAmount === 0 || parsedPaidAmount >= totalPrice)) {
      return res.status(400).json({
        message: 'Partially paid orders must have a paid amount greater than 0 and less than the total price'
      });
    }

    const newOrder = await Order.create({
      orderFrom,
      customerName,
      customerId,
      items: orderItems,
      totalPrice,
      expectedDeliveryDate: parsedDeliveryDate,
      paymentStatus: paymentStatus || 'unpaid',
      paidAmount: parsedPaidAmount,
      confirmationStatus: confirmationStatus || 'unconfirmed',
      customerNotes: customerNotes || '',
      priority: parsedPriority
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

router.put('/:id', async (req, res) => {
  try {
    const { orderFrom, customerName, customerId, items, expectedDeliveryDate, status, paymentStatus, paidAmount, confirmationStatus, customerNotes, priority } = req.body;

    if (customerNotes !== undefined && typeof customerNotes === 'string' && customerNotes.length > MAX_CUSTOMER_NOTES_LENGTH) {
      return res.status(400).json({ message: `Customer notes cannot exceed ${MAX_CUSTOMER_NOTES_LENGTH} characters` });
    }
    
    if (customerName !== undefined && !customerName?.trim()) {
      return res.status(400).json({ message: 'Customer name cannot be empty' });
    }

    if (customerId !== undefined && !customerId?.trim()) {
      return res.status(400).json({ message: 'Customer ID cannot be empty' });
    }

    if (status !== undefined && !VALID_ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_ORDER_STATUSES.join(', ')}` });
    }

    if (paymentStatus !== undefined && !VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
      return res.status(400).json({ message: `Invalid payment status. Must be one of: ${VALID_PAYMENT_STATUSES.join(', ')}` });
    }

    if (confirmationStatus !== undefined && !VALID_CONFIRMATION_STATUSES.includes(confirmationStatus)) {
      return res.status(400).json({ message: `Invalid confirmation status. Must be one of: ${VALID_CONFIRMATION_STATUSES.join(', ')}` });
    }

    let parsedPaidAmount;
    if (paidAmount !== undefined) {
      parsedPaidAmount = Number.parseFloat(paidAmount);
      if (Number.isNaN(parsedPaidAmount) || parsedPaidAmount < 0) {
        return res.status(400).json({ message: 'Paid amount must be a valid non-negative number' });
      }
    }

    let parsedPriority;
    if (priority !== undefined) {
      parsedPriority = Number.parseInt(priority, 10);
      if (Number.isNaN(parsedPriority) || parsedPriority < PRIORITY_MIN || parsedPriority > PRIORITY_MAX) {
        return res.status(400).json({ message: `Priority must be a number between ${PRIORITY_MIN} and ${PRIORITY_MAX}` });
      }
    }

    let parsedDeliveryDate;
    if (expectedDeliveryDate !== undefined) {
      if (expectedDeliveryDate === null || expectedDeliveryDate === '') {
        parsedDeliveryDate = null;
      } else {
        parsedDeliveryDate = new Date(expectedDeliveryDate);
        if (Number.isNaN(parsedDeliveryDate.getTime())) {
          return res.status(400).json({ message: 'Invalid expected delivery date' });
        }
      }
    }

    let orderItems;
    let totalPrice;
    
    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'At least one item is required' });
      }

      orderItems = [];
      totalPrice = 0;

      for (const orderItem of items) {
        const item = await Item.findById(orderItem.itemId);
        if (!item) {
          return res.status(400).json({ message: `Item with id ${orderItem.itemId} not found` });
        }
        
        const quantity = Number.parseInt(orderItem.quantity, 10);
        if (!Number.isInteger(quantity) || quantity < 1) {
          return res.status(400).json({ message: 'Quantity must be a positive integer' });
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
    }

    if (parsedPaidAmount !== undefined) {
      const existingOrder = await Order.findById(req.params.id);
      if (!existingOrder) {
        return res.status(404).json({ message: 'Order not found' });
      }
      const effectiveTotalPrice = totalPrice !== undefined ? totalPrice : existingOrder.totalPrice;
      if (parsedPaidAmount > effectiveTotalPrice) {
        return res.status(400).json({ message: 'Paid amount cannot exceed total price' });
      }
      
      if (paymentStatus === 'partially_paid' && (parsedPaidAmount <= 0 || parsedPaidAmount >= effectiveTotalPrice)) {
        return res.status(400).json({
          message: "For 'partially_paid' status, paid amount must be greater than 0 and less than total price"
        });
      }
    }

    const updateData = {};
    if (orderFrom !== undefined) updateData.orderFrom = orderFrom;
    if (customerName !== undefined) updateData.customerName = customerName;
    if (customerId !== undefined) updateData.customerId = customerId;
    if (parsedDeliveryDate !== undefined) updateData.expectedDeliveryDate = parsedDeliveryDate;
    if (status !== undefined) updateData.status = status;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (parsedPaidAmount !== undefined) updateData.paidAmount = parsedPaidAmount;
    if (confirmationStatus !== undefined) updateData.confirmationStatus = confirmationStatus;
    if (customerNotes !== undefined) updateData.customerNotes = customerNotes;
    if (parsedPriority !== undefined) updateData.priority = parsedPriority;
    if (orderItems !== undefined) updateData.items = orderItems;
    if (totalPrice !== undefined) updateData.totalPrice = totalPrice;

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
