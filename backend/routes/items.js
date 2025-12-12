import express from 'express';
const router = express.Router();
import { put, del } from '@vercel/blob';
import Item from '../models/Item.js';
import { createLogger } from '../utils/logger.js';
import { asyncHandler, badRequestError, notFoundError } from '../utils/errorHandler.js';
import { parsePaginationParams } from '../utils/pagination.js';
import { HTTP_STATUS } from '../constants/httpConstants.js';
import { IMAGE_CONFIG } from '../constants/imageConstants.js';
import { cacheMiddleware, invalidateItemCache } from '../middleware/cache.js';

const logger = createLogger('ItemsRoute');

async function uploadImage(image) {
  const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid image format');
  }
  
  const extension = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');
  
  if (buffer.length > IMAGE_CONFIG.MAX_SIZE) {
    throw new Error(`Image size should be less than ${IMAGE_CONFIG.MAX_SIZE_MB}MB`);
  }
  
  const filename = `items/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
  const blob = await put(filename, buffer, { 
    access: 'public',
    contentType: `image/${extension}`
  });
  
  return blob.url;
}

async function handleImageUpdate(image, existingImageUrl) {
  let newImageUrl = existingImageUrl;
  let oldImageUrl = null;

  if (image && typeof image === 'string' && image.startsWith('data:image/')) {
    oldImageUrl = existingImageUrl;
    newImageUrl = await uploadImage(image);
    logger.info('New image uploaded to blob storage', { url: newImageUrl });
  } else if (image === null || image === '') {
    oldImageUrl = existingImageUrl;
    newImageUrl = '';
  }

  return { newImageUrl, oldImageUrl };
}

async function deleteOldImage(oldImageUrl) {
  if (!oldImageUrl) return;
  
  try {
    await del(oldImageUrl);
    logger.info('Old image deleted from blob storage', { url: oldImageUrl });
  } catch (deleteError) {
    logger.warn('Failed to delete old image from blob storage', { url: oldImageUrl, error: deleteError.message });
  }
}

function validateItemName(name) {
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return { valid: false, error: 'Item name cannot be empty' };
  }
  return { valid: true };
}

function validateItemPrice(price) {
  if (price === undefined) {
    return { valid: true, parsedPrice: undefined };
  }
  
  const parsedPrice = Number.parseFloat(price);
  if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
    return { valid: false, error: 'Valid price is required' };
  }
  
  return { valid: true, parsedPrice };
}

/**
 * Validate paginated response format
 * @param {*} result - Result from paginated query
 * @param {string} source - Source function name for error logging
 * @throws {Error} If result format is invalid
 */
function validatePaginatedResponse(result, source) {
  if (!result || !result.items || !Array.isArray(result.items) || !result.pagination) {
    logger.error(`Invalid paginated result from ${source}`, { 
      resultType: typeof result,
      hasItems: !!result?.items,
      itemsIsArray: Array.isArray(result?.items),
      itemsLength: result?.items?.length,
      hasPagination: !!result?.pagination
    });
    throw badRequestError('Invalid paginated response: expected object with items array and pagination metadata');
  }
}

router.get('/', cacheMiddleware(300), asyncHandler(async (req, res) => {
  const { page, limit, search } = parsePaginationParams(req.query);
  
  // Log request details for debugging (metadata only to avoid exposing sensitive data)
  logger.debug('GET /api/items request', { 
    hasPageParam: 'page' in req.query,
    hasLimitParam: 'limit' in req.query,
    pageValue: req.query.page,
    limitValue: req.query.limit,
    hasSearchParam: !!req.query.search,
    searchLength: req.query.search?.length
  });
  
  // Check if pagination was requested (using truthy check to match original behavior)
  // This ensures that empty string values don't accidentally trigger pagination
  const paginationRequested = req.query.page || req.query.limit;
  
  if (paginationRequested) {
    const result = await Item.findPaginated({ page, limit, search });
    
    // Defensive check: ensure result has expected format
    validatePaginatedResponse(result, 'Item.findPaginated');
    
    logger.debug('Returning paginated response', { 
      itemCount: result.items.length, 
      page: result.pagination.page,
      totalPages: result.pagination.totalPages 
    });
    res.json(result);
  } else {
    const items = await Item.find();
    
    // Defensive check: ensure items is an array
    if (!Array.isArray(items)) {
      logger.error('Invalid result from Item.find', { 
        resultType: typeof items,
        isArray: Array.isArray(items),
        length: items?.length
      });
      throw badRequestError('Invalid non-paginated response: expected items array');
    }
    
    logger.debug('Returning non-paginated response', { itemCount: items.length });
    res.json(items);
  }
}));

router.get('/deleted', cacheMiddleware(300), asyncHandler(async (req, res) => {
  const { page, limit, search } = parsePaginationParams(req.query);
  
  const result = await Item.findDeletedPaginated({ page, limit, search });
  
  // Defensive check: ensure result has expected format
  validatePaginatedResponse(result, 'Item.findDeletedPaginated');
  
  res.json(result);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, price, color, fabric, specialFeatures, image } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw badRequestError('Item name is required');
  }

  const parsedPrice = Number.parseFloat(price);
  if (price === undefined || price === null || Number.isNaN(parsedPrice) || parsedPrice < 0) {
    throw badRequestError('Valid price is required');
  }

  let imageUrl = '';
  
  if (image && typeof image === 'string' && image.startsWith('data:image/')) {
    try {
      imageUrl = await uploadImage(image);
      logger.info('Image uploaded to blob storage', { url: imageUrl });
    } catch (uploadError) {
      logger.error('Failed to upload image to blob storage', uploadError);
      throw badRequestError(uploadError.message);
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
  
  // Invalidate item cache after creating a new item
  await invalidateItemCache();
  
  logger.info('Item created', { itemId: newItem._id, name: newItem.name });
  res.status(201).json(newItem);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const { name, price, color, fabric, specialFeatures, image } = req.body;

  // Validate name
  const nameValidation = validateItemName(name);
  if (!nameValidation.valid) {
    throw badRequestError(nameValidation.error);
  }

  // Validate price
  const priceValidation = validateItemPrice(price);
  if (!priceValidation.valid) {
    throw badRequestError(priceValidation.error);
  }

  const existingItem = await Item.findById(req.params.id);
  if (!existingItem) {
    throw notFoundError('Item');
  }

  // Handle image update
  let imageResult;
  try {
    imageResult = await handleImageUpdate(image, existingItem.imageUrl);
  } catch (uploadError) {
    logger.error('Failed to upload image to blob storage', uploadError);
    throw badRequestError(uploadError.message);
  }

  // Build update data
  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (priceValidation.parsedPrice !== undefined) updateData.price = priceValidation.parsedPrice;
  if (color !== undefined) updateData.color = color;
  if (fabric !== undefined) updateData.fabric = fabric;
  if (specialFeatures !== undefined) updateData.specialFeatures = specialFeatures;
  if (imageResult.newImageUrl !== existingItem.imageUrl) updateData.imageUrl = imageResult.newImageUrl;

  const updatedItem = await Item.findByIdAndUpdate(req.params.id, updateData);
  if (!updatedItem) {
    throw notFoundError('Item');
  }

  // Delete old image if needed
  await deleteOldImage(imageResult.oldImageUrl);
  
  // Invalidate item cache after updating
  await invalidateItemCache();
  
  logger.info('Item updated', { itemId: updatedItem._id, name: updatedItem.name });
  res.json(updatedItem);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const item = await Item.findByIdAndDelete(req.params.id);
  if (!item) {
    throw notFoundError('Item');
  }
  
  // Invalidate item cache after soft deletion
  await invalidateItemCache();
  
  logger.info('Item soft deleted', { itemId: req.params.id });
  res.json({ message: 'Item deleted' });
}));

router.post('/:id/restore', asyncHandler(async (req, res) => {
  const item = await Item.restore(req.params.id);
  if (!item) {
    throw notFoundError('Item');
  }
  
  // Invalidate item cache after restoration
  await invalidateItemCache();
  
  logger.info('Item restored', { itemId: req.params.id });
  res.json(item);
}));

router.delete('/:id/permanent', asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) {
    throw notFoundError('Item');
  }

  // Check if item is soft deleted
  if (!item.deletedAt) {
    throw badRequestError('Item must be soft-deleted before permanent image removal');
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
}));

export default router;
