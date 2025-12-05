const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const { createLogger } = require('../utils/logger');

const logger = createLogger('ItemsRoute');

const ALLOWED_LIMITS = [10, 20, 50];

router.get('/', async (req, res) => {
  try {
    const parsedPage = parseInt(req.query.page, 10);
    const parsedLimit = parseInt(req.query.limit, 10);
    const search = req.query.search || '';
    
    // If pagination params are provided, use paginated find
    if (req.query.page || req.query.limit) {
      const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
      const limit = ALLOWED_LIMITS.includes(parsedLimit) ? parsedLimit : 10;
      
      const result = await Item.findPaginated({ page, limit, search });
      res.json(result);
    } else {
      // Legacy: return all items for backwards compatibility
      const items = await Item.find();
      res.json(items);
    }
  } catch (error) {
    logger.error('Failed to fetch items', error);
    res.status(500).json({ message: 'Failed to fetch items' });
  }
});

// Get deleted items (for restore functionality)
router.get('/deleted', async (req, res) => {
  try {
    const parsedPage = parseInt(req.query.page, 10);
    const parsedLimit = parseInt(req.query.limit, 10);
    const search = req.query.search || '';
    
    const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const limit = ALLOWED_LIMITS.includes(parsedLimit) ? parsedLimit : 10;
    
    const result = await Item.findDeletedPaginated({ page, limit, search });
    res.json(result);
  } catch (error) {
    logger.error('Failed to fetch deleted items', error);
    res.status(500).json({ message: 'Failed to fetch deleted items' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, price, color, fabric, specialFeatures } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Item name is required' });
    }

    const parsedPrice = parseFloat(price);
    if (price === undefined || price === null || isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ message: 'Valid price is required' });
    }

    const newItem = await Item.create({
      name: name.trim(),
      price: parsedPrice,
      color: color || '',
      fabric: fabric || '',
      specialFeatures: specialFeatures || ''
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
    
    logger.info('Item soft deleted', { itemId: req.params.id });
    res.json({ message: 'Item deleted' });
  } catch (error) {
    logger.error('Failed to delete item', error);
    res.status(500).json({ message: 'Failed to delete item' });
  }
});

// Restore a soft-deleted item
router.post('/:id/restore', async (req, res) => {
  try {
    const item = await Item.restore(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    logger.info('Item restored', { itemId: req.params.id });
    res.json(item);
  } catch (error) {
    logger.error('Failed to restore item', error);
    res.status(500).json({ message: 'Failed to restore item' });
  }
});

module.exports = router;
