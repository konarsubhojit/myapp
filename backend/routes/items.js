const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const { createLogger } = require('../utils/logger');

const logger = createLogger('ItemsRoute');

router.get('/', async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (error) {
    logger.error('Failed to fetch items', error);
    res.status(500).json({ message: 'Failed to fetch items' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, price } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Item name is required' });
    }

    const parsedPrice = parseFloat(price);
    if (price === undefined || price === null || isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ message: 'Valid price is required' });
    }

    const newItem = await Item.create({
      name: name.trim(),
      price: parsedPrice
    });
    
    logger.info('Item created', { itemId: newItem._id, name: newItem.name });
    res.status(201).json(newItem);
  } catch (error) {
    logger.error('Failed to create item', error);
    res.status(500).json({ message: 'Failed to create item' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    logger.info('Item deleted', { itemId: req.params.id });
    res.json({ message: 'Item deleted' });
  } catch (error) {
    logger.error('Failed to delete item', error);
    res.status(500).json({ message: 'Failed to delete item' });
  }
});

module.exports = router;
