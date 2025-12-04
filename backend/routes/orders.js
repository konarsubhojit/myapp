const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Item = require('../models/Item');
const { createLogger } = require('../utils/logger');

const logger = createLogger('OrdersRoute');

router.get('/', async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (error) {
    logger.error('Failed to fetch orders', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { orderFrom, customerName, customerId, items } = req.body;

    if (!orderFrom || !customerName || !customerId) {
      return res.status(400).json({ message: 'Order source, customer name, and customer ID are required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
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
        quantity: quantity
      });

      totalPrice += item.price * quantity;
    }

    const newOrder = await Order.create({
      orderFrom,
      customerName,
      customerId,
      items: orderItems,
      totalPrice
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

module.exports = router;
