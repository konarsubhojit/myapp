const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Item = require('../models/Item');

// Get all orders
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new order
router.post('/', async (req, res) => {
  try {
    const { orderFrom, customerName, customerId, items } = req.body;

    // Validate items and calculate total price
    let totalPrice = 0;
    const orderItems = [];

    for (const orderItem of items) {
      const item = await Item.findById(orderItem.itemId);
      if (!item) {
        return res.status(400).json({ message: `Item with id ${orderItem.itemId} not found` });
      }
      
      const quantity = parseInt(orderItem.quantity, 10);
      if (quantity < 1) {
        return res.status(400).json({ message: 'Quantity must be at least 1' });
      }

      orderItems.push({
        item: item._id,
        name: item.name,
        price: item.price,
        quantity: quantity
      });

      totalPrice += item.price * quantity;
    }

    const order = new Order({
      orderFrom,
      customerName,
      customerId,
      items: orderItems,
      totalPrice
    });

    const newOrder = await order.save();
    res.status(201).json(newOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get a specific order
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
