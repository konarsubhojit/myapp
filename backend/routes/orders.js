const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Item = require('../models/Item');
const { createLogger } = require('../utils/logger');

const logger = createLogger('OrdersRoute');

router.get('/', async (req, res) => {
  try {
    const parsedPage = parseInt(req.query.page, 10);
    const parsedLimit = parseInt(req.query.limit, 10);
    const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const limit = Number.isNaN(parsedLimit) ? 10 : parsedLimit;
    
    // Validate limit to be one of allowed values
    const allowedLimits = [10, 20, 50];
    const validLimit = allowedLimits.includes(limit) ? limit : 10;
    
    // If page and limit params are provided, use paginated find
    if (req.query.page || req.query.limit) {
      const result = await Order.findPaginated({ page, limit: validLimit });
      res.json(result);
    } else {
      // Legacy: return all orders for backwards compatibility (used by sales report)
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

    if (!orderFrom || !customerName || !customerId) {
      return res.status(400).json({ message: 'Order source, customer name, and customer ID are required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    // Validate expectedDeliveryDate if provided
    let parsedDeliveryDate = null;
    if (expectedDeliveryDate) {
      parsedDeliveryDate = new Date(expectedDeliveryDate);
      if (isNaN(parsedDeliveryDate.getTime())) {
        return res.status(400).json({ message: 'Invalid expected delivery date' });
      }
      
      // Ensure the delivery date is not in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deliveryDate = new Date(parsedDeliveryDate);
      deliveryDate.setHours(0, 0, 0, 0);
      
      if (deliveryDate < today) {
        return res.status(400).json({ message: 'Expected delivery date cannot be in the past' });
      }
    }

    // Validate payment status if provided
    const validPaymentStatuses = ['unpaid', 'partially_paid', 'paid', 'cash_on_delivery', 'refunded'];
    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({ message: `Invalid payment status. Must be one of: ${validPaymentStatuses.join(', ')}` });
    }

    // Validate confirmation status if provided
    const validConfirmationStatuses = ['unconfirmed', 'pending_confirmation', 'confirmed', 'cancelled'];
    if (confirmationStatus && !validConfirmationStatuses.includes(confirmationStatus)) {
      return res.status(400).json({ message: `Invalid confirmation status. Must be one of: ${validConfirmationStatuses.join(', ')}` });
    }

    // Validate paid amount if provided
    let parsedPaidAmount = 0;
    if (paidAmount !== undefined && paidAmount !== null) {
      parsedPaidAmount = parseFloat(paidAmount);
      if (isNaN(parsedPaidAmount) || parsedPaidAmount < 0) {
        return res.status(400).json({ message: 'Paid amount must be a valid non-negative number' });
      }
    }

    // Validate priority if provided
    let parsedPriority = 0;
    if (priority !== undefined && priority !== null) {
      parsedPriority = parseInt(priority, 10);
      if (isNaN(parsedPriority) || parsedPriority < 0 || parsedPriority > 5) {
        return res.status(400).json({ message: 'Priority must be a number between 0 and 5' });
      }
    }

    let totalPrice = 0;
    const orderItems = [];

    for (const orderItem of items) {
      const item = await Item.findById(orderItem.itemId);
      if (!item) {
        return res.status(400).json({ message: `Item with id ${orderItem.itemId} not found` });
      }
      
      const quantity = parseInt(orderItem.quantity, 10);
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

    // Validate paid amount against total price
    if (parsedPaidAmount > totalPrice) {
      return res.status(400).json({ message: 'Paid amount cannot exceed total price' });
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

// Update an existing order
router.put('/:id', async (req, res) => {
  try {
    const { orderFrom, customerName, customerId, items, expectedDeliveryDate, status, paymentStatus, paidAmount, confirmationStatus, customerNotes, priority } = req.body;

    // Validate required fields if provided
    if (customerName !== undefined && (!customerName || !customerName.trim())) {
      return res.status(400).json({ message: 'Customer name cannot be empty' });
    }

    if (customerId !== undefined && (!customerId || !customerId.trim())) {
      return res.status(400).json({ message: 'Customer ID cannot be empty' });
    }

    // Validate status if provided
    const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
    if (status !== undefined && !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Validate payment status if provided
    const validPaymentStatuses = ['unpaid', 'partially_paid', 'paid', 'cash_on_delivery', 'refunded'];
    if (paymentStatus !== undefined && !validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({ message: `Invalid payment status. Must be one of: ${validPaymentStatuses.join(', ')}` });
    }

    // Validate confirmation status if provided
    const validConfirmationStatuses = ['unconfirmed', 'pending_confirmation', 'confirmed', 'cancelled'];
    if (confirmationStatus !== undefined && !validConfirmationStatuses.includes(confirmationStatus)) {
      return res.status(400).json({ message: `Invalid confirmation status. Must be one of: ${validConfirmationStatuses.join(', ')}` });
    }

    // Validate paid amount if provided
    let parsedPaidAmount;
    if (paidAmount !== undefined) {
      parsedPaidAmount = parseFloat(paidAmount);
      if (isNaN(parsedPaidAmount) || parsedPaidAmount < 0) {
        return res.status(400).json({ message: 'Paid amount must be a valid non-negative number' });
      }
    }

    // Validate priority if provided
    let parsedPriority;
    if (priority !== undefined) {
      parsedPriority = parseInt(priority, 10);
      if (isNaN(parsedPriority) || parsedPriority < 0 || parsedPriority > 5) {
        return res.status(400).json({ message: 'Priority must be a number between 0 and 5' });
      }
    }

    // Validate expectedDeliveryDate if provided
    let parsedDeliveryDate = undefined;
    if (expectedDeliveryDate !== undefined) {
      if (expectedDeliveryDate === null || expectedDeliveryDate === '') {
        parsedDeliveryDate = null;
      } else {
        parsedDeliveryDate = new Date(expectedDeliveryDate);
        if (isNaN(parsedDeliveryDate.getTime())) {
          return res.status(400).json({ message: 'Invalid expected delivery date' });
        }
      }
    }

    // If items are provided, validate and calculate new total
    let orderItems = undefined;
    let totalPrice = undefined;
    
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
        
        const quantity = parseInt(orderItem.quantity, 10);
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

    // Validate paid amount against total price
    if (parsedPaidAmount !== undefined) {
      // Get existing order to validate against its total price if items not being updated
      const existingOrder = await Order.findById(req.params.id);
      if (!existingOrder) {
        return res.status(404).json({ message: 'Order not found' });
      }
      const effectiveTotalPrice = totalPrice !== undefined ? totalPrice : existingOrder.totalPrice;
      if (parsedPaidAmount > effectiveTotalPrice) {
        return res.status(400).json({ message: 'Paid amount cannot exceed total price' });
      }
      // Additional validation for 'partially_paid' status
      if (
        paymentStatus === 'partially_paid' &&
        (parsedPaidAmount <= 0 || parsedPaidAmount >= effectiveTotalPrice)
      ) {
        return res.status(400).json({
          message: "For 'partially_paid' status, paid amount must be greater than 0 and less than total price"
        });
      }
    }

    // Build update data
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
