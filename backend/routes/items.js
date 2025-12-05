const express = require('express');
const router = express.Router();
const { put, del } = require('@vercel/blob');
const Item = require('../models/Item');
const { createLogger } = require('../utils/logger');

const logger = createLogger('ItemsRoute');

const ALLOWED_LIMITS = [10, 20, 50];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB max

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
    const { name, price, color, fabric, specialFeatures, image } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Item name is required' });
    }

    const parsedPrice = parseFloat(price);
    if (price === undefined || price === null || isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ message: 'Valid price is required' });
    }

    let imageUrl = '';
    
    // Upload image to Vercel Blob if provided
    if (image && typeof image === 'string' && image.startsWith('data:image/')) {
      try {
        // Extract base64 data and mime type
        const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
          return res.status(400).json({ message: 'Invalid image format' });
        }
        
        const extension = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Check file size
        if (buffer.length > MAX_IMAGE_SIZE) {
          return res.status(400).json({ message: 'Image size should be less than 2MB' });
        }
        
        // Generate unique filename
        const filename = `items/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
        
        // Upload to Vercel Blob
        const blob = await put(filename, buffer, { 
          access: 'public',
          contentType: `image/${extension}`
        });
        
        imageUrl = blob.url;
        logger.info('Image uploaded to blob storage', { url: imageUrl });
      } catch (uploadError) {
        logger.error('Failed to upload image to blob storage', uploadError);
        return res.status(500).json({ message: 'Failed to upload image' });
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

// Update an existing item
router.put('/:id', async (req, res) => {
  try {
    const { name, price, color, fabric, specialFeatures, image } = req.body;

    // Validate name if provided
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ message: 'Item name cannot be empty' });
    }

    // Validate price if provided
    let parsedPrice;
    if (price !== undefined) {
      parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ message: 'Valid price is required' });
      }
    }

    // Get existing item to check for old image
    const existingItem = await Item.findById(req.params.id);
    if (!existingItem) {
      return res.status(404).json({ message: 'Item not found' });
    }

    let imageUrl = existingItem.imageUrl;
    let oldImageUrl = null;

    // Upload new image to Vercel Blob if provided
    if (image && typeof image === 'string' && image.startsWith('data:image/')) {
      try {
        // Extract base64 data and mime type
        const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
          return res.status(400).json({ message: 'Invalid image format' });
        }
        
        const extension = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Check file size
        if (buffer.length > MAX_IMAGE_SIZE) {
          return res.status(400).json({ message: 'Image size should be less than 2MB' });
        }
        
        // Generate unique filename
        const filename = `items/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
        
        // Upload to Vercel Blob
        const blob = await put(filename, buffer, { 
          access: 'public',
          contentType: `image/${extension}`
        });
        
        oldImageUrl = existingItem.imageUrl; // Store old URL for deletion
        imageUrl = blob.url;
        logger.info('New image uploaded to blob storage', { url: imageUrl });
      } catch (uploadError) {
        logger.error('Failed to upload image to blob storage', uploadError);
        return res.status(500).json({ message: 'Failed to upload image' });
      }
    } else if (image === null || image === '') {
      // User wants to remove the image
      oldImageUrl = existingItem.imageUrl;
      imageUrl = '';
    }

    // Update the item
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

    // Delete old image from blob storage if a new image was uploaded
    if (oldImageUrl) {
      try {
        await del(oldImageUrl);
        logger.info('Old image deleted from blob storage', { url: oldImageUrl });
      } catch (deleteError) {
        // Log the error but don't fail the request
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
