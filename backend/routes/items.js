import express from 'express';
const router = express.Router();
import { put, del } from '@vercel/blob';
import Item from '../models/Item.js';
import ItemDesign from '../models/ItemDesign.js';
import { createLogger } from '../utils/logger.js';
import { asyncHandler, badRequestError, notFoundError } from '../utils/errorHandler.js';
import { PAGINATION } from '../constants/paginationConstants.js';
import { IMAGE_CONFIG } from '../constants/imageConstants.js';
import { cacheMiddleware, invalidateItemCache } from '../middleware/cache.js';
import { getRedisIfReady } from '../db/redisClient.js';

const logger = createLogger('ItemsRoute');

const ALLOWED_LIMITS = new Set(PAGINATION.ALLOWED_LIMITS);

/**
 * Parse and validate cursor pagination parameters from query string
 * @param {Object} query - Express request query object
 * @returns {Object} Validated parameters { limit, cursor, search }
 */
function parseCursorParams(query) {
  const parsedLimit = Number.parseInt(query.limit, 10);
  
  return {
    limit: ALLOWED_LIMITS.has(parsedLimit) ? parsedLimit : PAGINATION.DEFAULT_LIMIT,
    cursor: query.cursor || null,
    search: query.search || ''
  };
}

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
 * Validate cursor-paginated response format
 * @param {*} result - Result from cursor-paginated query
 * @param {string} source - Source function name for error logging
 * @throws {Error} If result format is invalid
 */
function validateCursorResponse(result, source) {
  if (!result || !result.items || !Array.isArray(result.items) || !result.page) {
    logger.error(`Invalid cursor result from ${source}`, { 
      resultType: typeof result,
      hasItems: !!result?.items,
      itemsIsArray: Array.isArray(result?.items),
      itemsLength: result?.items?.length,
      hasPage: !!result?.page
    });
    throw badRequestError('Invalid cursor response: expected object with items array and page metadata');
  }
}

router.get('/', cacheMiddleware(86400), asyncHandler(async (req, res) => {
  const { limit, cursor, search } = parseCursorParams(req.query);
  
  // Log request details for debugging (metadata only to avoid exposing sensitive data)
  logger.debug('GET /api/items request', { 
    hasCursorParam: !!req.query.cursor,
    hasLimitParam: 'limit' in req.query,
    limitValue: req.query.limit,
    hasSearchParam: !!req.query.search,
    searchLength: req.query.search?.length
  });
  
  try {
    const result = await Item.findCursor({ limit, cursor, search });
    
    // Defensive check: ensure result has expected format
    validateCursorResponse(result, 'Item.findCursor');
    
    logger.debug('Returning cursor-paginated response', { 
      itemCount: result.items.length,
      hasMore: result.page.hasMore,
      nextCursor: result.page.nextCursor ? 'present' : 'null'
    });
    
    res.json(result);
  } catch (error) {
    // Provide helpful error message for invalid cursor
    if (error.message && error.message.includes('Invalid cursor format')) {
      throw badRequestError(error.message);
    }
    throw error;
  }
}));

router.get('/deleted', cacheMiddleware(86400), asyncHandler(async (req, res) => {
  const { limit, cursor, search } = parseCursorParams(req.query);
  
  logger.debug('GET /api/items/deleted request', {
    hasCursorParam: !!req.query.cursor,
    hasLimitParam: 'limit' in req.query,
    hasSearchParam: !!req.query.search
  });
  
  try {
    const result = await Item.findDeletedCursor({ limit, cursor, search });
    
    // Defensive check: ensure result has expected format
    validateCursorResponse(result, 'Item.findDeletedCursor');
    
    logger.debug('Returning cursor-paginated deleted items', {
      itemCount: result.items.length,
      hasMore: result.page.hasMore
    });
    
    res.json(result);
  } catch (error) {
    // Provide helpful error message for invalid cursor
    if (error.message && error.message.includes('Invalid cursor format')) {
      throw badRequestError(error.message);
    }
    throw error;
  }
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
  
  // Invalidate cache after creating to bust stale data
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

  // Delete old image if needed (async, non-blocking)
  await deleteOldImage(imageResult.oldImageUrl);
  
  // Invalidate cache after update to bust stale data
  await invalidateItemCache();
  
  logger.info('Item updated', { itemId: updatedItem._id, name: updatedItem.name });
  res.json(updatedItem);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const item = await Item.findByIdAndDelete(req.params.id);
  if (!item) {
    throw notFoundError('Item');
  }
  
  // Invalidate cache after deletion to bust stale data
  await invalidateItemCache();
  
  logger.info('Item soft deleted', { itemId: req.params.id });
  res.json({ message: 'Item deleted' });
}));

router.post('/:id/restore', asyncHandler(async (req, res) => {
  const item = await Item.restore(req.params.id);
  if (!item) {
    throw notFoundError('Item');
  }
  
  // Invalidate cache after restoration to bust stale data
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

router.get('/:id', asyncHandler(async (req, res) => {
  const itemId = req.params.id;
  const includeDesigns = req.query.includeDesigns === 'true';
  
  const redisClient = getRedisIfReady();
  const cacheKey = includeDesigns ? `item:${itemId}:with-designs` : `item:${itemId}`;
  
  if (redisClient) {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug('Item cache hit', { itemId, includeDesigns });
        return res.json(JSON.parse(cached));
      }
    } catch (error) {
      logger.warn('Redis get failed', { error: error.message });
    }
  }
  
  const item = await Item.findById(itemId);
  if (!item) {
    throw notFoundError('Item');
  }
  
  let response = item;
  
  if (includeDesigns) {
    const designs = await ItemDesign.findByItemId(itemId);
    response = { ...item, designs };
  }
  
  if (redisClient) {
    try {
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(response));
      logger.debug('Item cached', { itemId, includeDesigns });
    } catch (error) {
      logger.warn('Redis set failed', { error: error.message });
    }
  }
  
  res.json(response);
}));

router.get('/:id/designs', asyncHandler(async (req, res) => {
  const itemId = req.params.id;
  
  const item = await Item.findById(itemId);
  if (!item) {
    throw notFoundError('Item');
  }
  
  const designs = await ItemDesign.findByItemId(itemId);
  res.json(designs);
}));

router.post('/:id/designs', asyncHandler(async (req, res) => {
  const itemId = req.params.id;
  const { designName, image, isPrimary, displayOrder } = req.body;
  
  const item = await Item.findById(itemId);
  if (!item) {
    throw notFoundError('Item');
  }
  
  if (!designName || typeof designName !== 'string' || !designName.trim()) {
    throw badRequestError('Design name is required');
  }
  
  if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
    throw badRequestError('Valid design image is required');
  }
  
  let imageUrl = '';
  try {
    imageUrl = await uploadImage(image);
    logger.info('Design image uploaded to blob storage', { url: imageUrl });
  } catch (uploadError) {
    logger.error('Failed to upload design image', uploadError);
    throw badRequestError(uploadError.message);
  }
  
  // If this design is marked as primary, unset primary flag on all other designs first
  if (isPrimary === true) {
    await ItemDesign.updatePrimary(itemId, -1); // This will set all to false
  }
  
  const newDesign = await ItemDesign.create({
    itemId: Number.parseInt(itemId, 10),
    designName: designName.trim(),
    imageUrl,
    isPrimary: isPrimary || false,
    displayOrder: displayOrder || 0
  });
  
  await invalidateItemCache();
  
  logger.info('Design created', { designId: newDesign._id, itemId, designName: newDesign.designName });
  res.status(201).json(newDesign);
}));

router.put('/:id/designs/:designId', asyncHandler(async (req, res) => {
  const { id: itemId, designId } = req.params;
  const { isPrimary, displayOrder } = req.body;
  
  const item = await Item.findById(itemId);
  if (!item) {
    throw notFoundError('Item');
  }
  
  const design = await ItemDesign.findById(designId);
  if (!design) {
    throw notFoundError('Design');
  }
  
  if (design.itemId !== Number.parseInt(itemId, 10)) {
    throw badRequestError('Design does not belong to this item');
  }
  
  let updatedDesign;
  
  if (isPrimary === true) {
    updatedDesign = await ItemDesign.updatePrimary(itemId, designId);
  } else {
    updatedDesign = await ItemDesign.update(designId, { isPrimary, displayOrder });
  }
  
  if (!updatedDesign) {
    throw notFoundError('Design');
  }
  
  await invalidateItemCache();
  
  logger.info('Design updated', { designId, itemId });
  res.json(updatedDesign);
}));

router.delete('/:id/designs/:designId', asyncHandler(async (req, res) => {
  const { id: itemId, designId } = req.params;
  
  const item = await Item.findById(itemId);
  if (!item) {
    throw notFoundError('Item');
  }
  
  const design = await ItemDesign.findById(designId);
  if (!design) {
    throw notFoundError('Design');
  }
  
  if (design.itemId !== Number.parseInt(itemId, 10)) {
    throw badRequestError('Design does not belong to this item');
  }
  
  const deletedDesign = await ItemDesign.delete(designId);
  
  if (design.imageUrl) {
    try {
      await del(design.imageUrl);
      logger.info('Design image deleted from blob storage', { url: design.imageUrl });
    } catch (deleteError) {
      logger.warn('Failed to delete design image from blob storage', { url: design.imageUrl, error: deleteError.message });
    }
  }
  
  await invalidateItemCache();
  
  logger.info('Design deleted', { designId, itemId });
  res.json({ message: 'Design deleted', design: deletedDesign });
}));

export default router;
