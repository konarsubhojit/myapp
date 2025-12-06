const express = require('express');
const router = express.Router();
const { put, del } = require('@vercel/blob');
const Item = require('../models/Item');
const { createLogger } = require('../utils/logger');

const logger = createLogger('ItemsRoute');

const ALLOWED_LIMITS = [10, 20, 50];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

async function uploadImage(image) {
  const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid image format');
  }
  
  const extension = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');
  
  if (buffer.length > MAX_IMAGE_SIZE) {
    throw new Error('Image size should be less than 2MB');
  }
  
  const filename = `items/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
  const blob = await put(filename, buffer, { 
    access: 'public',
    contentType: `image/${extension}`
  });
  
  return blob.url;
}

router.get('/', async (req, res) => {
  try {
    const parsedPage = parseInt(req.query.page, 10);
    const parsedLimit = parseInt(req.query.limit, 10);
    const search = req.query.search || '';
    
    if (req.query.page || req.query.limit) {
      const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
      const limit = ALLOWED_LIMITS.includes(parsedLimit) ? parsedLimit : 10;
      
      const result = await Item.findPaginated({ page, limit, search });
      res.json(result);
    } else {
      const items = await Item.find();
      res.json(items);
    }
  } catch (error) {
    logger.error('Failed to fetch items', error);
    res.status(500).json({ message: 'Failed to fetch items' });
  }
});

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
    const { name, price, color, fabric, specialFeatures, image } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Item name is required' });
    }

    const parsedPrice = parseFloat(price);
    if (price === undefined || price === null || isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ message: 'Valid price is required' });
    }

    let imageUrl = '';
    
    if (image && typeof image === 'string' && image.startsWith('data:image/')) {
      try {
        imageUrl = await uploadImage(image);
        logger.info('Image uploaded to blob storage', { url: imageUrl });
      } catch (uploadError) {
        logger.error('Failed to upload image to blob storage', uploadError);
        return res.status(400).json({ message: uploadError.message });
      }
    }

    const newItem = await Item.create({
      name: name.trim(),
      price: parsedPrice,
      color: color || '',
      fabric: fabric || '',
      specialFeatures: specialFeatures || '',
      imageUrl: imageUrl
    });
    
    logger.info('Item created', { itemId: newItem._id, name: newItem.name });
    res.status(201).json(newItem);
  } catch (error) {
    logger.error('Failed to create item', error);
    res.status(500).json({ message: 'Failed to create item' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, price, color, fabric, specialFeatures, image } = req.body;

    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ message: 'Item name cannot be empty' });
    }

    let parsedPrice;
    if (price !== undefined) {
      parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ message: 'Valid price is required' });
      }
    }

    const existingItem = await Item.findById(req.params.id);
    if (!existingItem) {
      return res.status(404).json({ message: 'Item not found' });
    }

    let imageUrl = existingItem.imageUrl;
    let oldImageUrl = null;

    if (image && typeof image === 'string' && image.startsWith('data:image/')) {
      try {
        oldImageUrl = existingItem.imageUrl;
        imageUrl = await uploadImage(image);
        logger.info('New image uploaded to blob storage', { url: imageUrl });
      } catch (uploadError) {
        logger.error('Failed to upload image to blob storage', uploadError);
        return res.status(400).json({ message: uploadError.message });
      }
    } else if (image === null || image === '') {
      oldImageUrl = existingItem.imageUrl;
      imageUrl = '';
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (parsedPrice !== undefined) updateData.price = parsedPrice;
    if (color !== undefined) updateData.color = color;
    if (fabric !== undefined) updateData.fabric = fabric;
    if (specialFeatures !== undefined) updateData.specialFeatures = specialFeatures;
    if (imageUrl !== existingItem.imageUrl) updateData.imageUrl = imageUrl;

    const updatedItem = await Item.findByIdAndUpdate(req.params.id, updateData);
    if (!updatedItem) {
      return res.status(404).json({ message: 'Item not found' });
    }

    if (oldImageUrl) {
      try {
        await del(oldImageUrl);
        logger.info('Old image deleted from blob storage', { url: oldImageUrl });
      } catch (deleteError) {
        logger.warn('Failed to delete old image from blob storage', { url: oldImageUrl, error: deleteError.message });
      }
    }
    
    logger.info('Item updated', { itemId: updatedItem._id, name: updatedItem.name });
    res.json(updatedItem);
  } catch (error) {
    logger.error('Failed to update item', error);
    res.status(500).json({ message: 'Failed to update item' });
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

router.delete('/:id/permanent', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if item is soft deleted
    if (!item.deletedAt) {
      return res.status(400).json({ message: 'Item must be soft deleted before permanent deletion' });
    }

    const imageUrl = item.imageUrl;

    // Remove image from blob storage if it exists
    if (imageUrl) {
      try {
        await del(imageUrl);
        logger.info('Image deleted from blob storage', { url: imageUrl });
      } catch (deleteError) {
        logger.warn('Failed to delete image from blob storage', { url: imageUrl, error: deleteError.message });
      }
    }

    // Clear the imageUrl from the item record (keep the item for historical orders)
    await Item.permanentlyRemoveImage(req.params.id);
    
    logger.info('Item image permanently removed', { itemId: req.params.id });
    res.json({ message: 'Item image permanently removed' });
  } catch (error) {
    logger.error('Failed to permanently remove item image', error);
    res.status(500).json({ message: 'Failed to permanently remove item image' });
  }
});

module.exports = router;
