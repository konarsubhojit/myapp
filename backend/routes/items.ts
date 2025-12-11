import express, { Request, Response } from 'express';
import { put, del } from '@vercel/blob';
import Item from '../models/Item.js';
import { createLogger } from '../utils/logger.js';
import { HTTP_STATUS } from '../constants/httpConstants.js';
import { PAGINATION, isAllowedLimit, type AllowedLimit } from '../constants/paginationConstants.js';
import { IMAGE_CONFIG } from '../constants/imageConstants.js';
import type { ValidationResult } from '../types/index.js';

const router = express.Router();
const logger = createLogger('ItemsRoute');

const ALLOWED_LIMITS = new Set<AllowedLimit>(PAGINATION.ALLOWED_LIMITS);

interface ImageUploadResult {
  newImageUrl: string;
  oldImageUrl: string | null;
}

async function uploadImage(image: string): Promise<string> {
  const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches || matches.length < 3) {
    throw new Error('Invalid image format');
  }
  
  const extension = matches[1];
  const base64Data = matches[2];
  
  if (!extension || !base64Data) {
    throw new Error('Invalid image format');
  }
  
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

async function handleImageUpdate(
  image: string | null | undefined, 
  existingImageUrl: string
): Promise<ImageUploadResult> {
  let newImageUrl = existingImageUrl;
  let oldImageUrl: string | null = null;

  if (image && typeof image === 'string' && image.startsWith('data:image/')) {
    oldImageUrl = existingImageUrl || null;
    newImageUrl = await uploadImage(image);
    logger.info('New image uploaded to blob storage', { url: newImageUrl });
  } else if (image === null || image === '') {
    oldImageUrl = existingImageUrl || null;
    newImageUrl = '';
  }

  return { newImageUrl, oldImageUrl };
}

async function deleteOldImage(oldImageUrl: string | null): Promise<void> {
  if (!oldImageUrl) return;
  
  try {
    await del(oldImageUrl);
    logger.info('Old image deleted from blob storage', { url: oldImageUrl });
  } catch (deleteError) {
    const errorMessage = deleteError instanceof Error ? deleteError.message : String(deleteError);
    logger.warn('Failed to delete old image from blob storage', { url: oldImageUrl, error: errorMessage });
  }
}

function validateItemName(name: string | undefined): ValidationResult {
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return { valid: false, error: 'Item name cannot be empty' };
  }
  return { valid: true };
}

function validateItemPrice(price: string | number | undefined): ValidationResult & { parsedPrice?: number } {
  if (price === undefined) {
    return { valid: true, parsedPrice: undefined };
  }
  
  const parsedPrice = Number.parseFloat(String(price));
  if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
    return { valid: false, error: 'Valid price is required' };
  }
  
  return { valid: true, parsedPrice };
}

interface ItemRequestBody {
  name?: string;
  price?: string | number;
  color?: string;
  fabric?: string;
  specialFeatures?: string;
  image?: string | null;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const parsedPage = Number.parseInt(req.query.page as string, 10);
    const parsedLimit = Number.parseInt(req.query.limit as string, 10);
    const search = (req.query.search as string) || '';
    
    if (req.query.page || req.query.limit) {
      const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
      const limit = isAllowedLimit(parsedLimit) ? parsedLimit : 10;
      
      const result = await Item.findPaginated({ page, limit, search });
      res.json(result);
    } else {
      const items = await Item.find();
      res.json(items);
    }
  } catch (error) {
    logger.error('Failed to fetch items', error instanceof Error ? error : new Error(String(error)));
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to fetch items' });
  }
});

router.get('/deleted', async (req: Request, res: Response) => {
  try {
    const parsedPage = Number.parseInt(req.query.page as string, 10);
    const parsedLimit = Number.parseInt(req.query.limit as string, 10);
    const search = (req.query.search as string) || '';
    
    const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const limit: AllowedLimit = (ALLOWED_LIMITS.has(parsedLimit as AllowedLimit) ? parsedLimit : 10) as AllowedLimit;
    
    const result = await Item.findDeletedPaginated({ page, limit, search });
    res.json(result);
  } catch (error) {
    logger.error('Failed to fetch deleted items', error instanceof Error ? error : new Error(String(error)));
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to fetch deleted items' });
  }
});

router.post('/', async (req: Request<object, object, ItemRequestBody>, res: Response) => {
  try {
    const { name, price, color, fabric, specialFeatures, image } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Item name is required' });
    }

    const parsedPrice = Number.parseFloat(String(price));
    if (price === undefined || price === null || Number.isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Valid price is required' });
    }

    let imageUrl = '';
    
    if (image && typeof image === 'string' && image.startsWith('data:image/')) {
      try {
        imageUrl = await uploadImage(image);
        logger.info('Image uploaded to blob storage', { url: imageUrl });
      } catch (uploadError) {
        const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError);
        logger.error('Failed to upload image to blob storage', new Error(errorMessage));
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: errorMessage });
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
    logger.error('Failed to create item', error instanceof Error ? error : new Error(String(error)));
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to create item' });
  }
});

router.put('/:id', async (req: Request<{ id: string }, object, ItemRequestBody>, res: Response) => {
  try {
    const { name, price, color, fabric, specialFeatures, image } = req.body;

    // Validate name
    const nameValidation = validateItemName(name);
    if (!nameValidation.valid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: nameValidation.error });
    }

    // Validate price
    const priceValidation = validateItemPrice(price);
    if (!priceValidation.valid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: priceValidation.error });
    }

    const existingItem = await Item.findById(req.params.id);
    if (!existingItem) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Item not found' });
    }

    // Handle image update
    let imageResult: ImageUploadResult;
    try {
      imageResult = await handleImageUpdate(image, existingItem.imageUrl);
    } catch (uploadError) {
      const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError);
      logger.error('Failed to upload image to blob storage', new Error(errorMessage));
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: errorMessage });
    }

    // Build update data
    const updateData: Record<string, string | number | undefined> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (priceValidation.parsedPrice !== undefined) updateData.price = priceValidation.parsedPrice;
    if (color !== undefined) updateData.color = color;
    if (fabric !== undefined) updateData.fabric = fabric;
    if (specialFeatures !== undefined) updateData.specialFeatures = specialFeatures;
    if (imageResult.newImageUrl !== existingItem.imageUrl) updateData.imageUrl = imageResult.newImageUrl;

    const updatedItem = await Item.findByIdAndUpdate(req.params.id, updateData);
    if (!updatedItem) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Item not found' });
    }

    // Delete old image if needed
    await deleteOldImage(imageResult.oldImageUrl);
    
    logger.info('Item updated', { itemId: updatedItem._id, name: updatedItem.name });
    res.json(updatedItem);
  } catch (error) {
    logger.error('Failed to update item', error instanceof Error ? error : new Error(String(error)));
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to update item' });
  }
});

router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Item not found' });
    }
    
    logger.info('Item soft deleted', { itemId: req.params.id });
    res.json({ message: 'Item deleted' });
  } catch (error) {
    logger.error('Failed to delete item', error instanceof Error ? error : new Error(String(error)));
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to delete item' });
  }
});

router.post('/:id/restore', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const item = await Item.restore(req.params.id);
    if (!item) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Item not found' });
    }
    
    logger.info('Item restored', { itemId: req.params.id });
    res.json(item);
  } catch (error) {
    logger.error('Failed to restore item', error instanceof Error ? error : new Error(String(error)));
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to restore item' });
  }
});

router.delete('/:id/permanent', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Item not found' });
    }

    // Check if item is soft deleted
    if (!item.deletedAt) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Item must be soft-deleted before permanent image removal' });
    }

    const imageUrl = item.imageUrl;

    // Remove image from blob storage if it exists
    if (imageUrl) {
      try {
        await del(imageUrl);
        logger.info('Image deleted from blob storage', { url: imageUrl });
      } catch (deleteError) {
        const errorMessage = deleteError instanceof Error ? deleteError.message : String(deleteError);
        logger.warn('Failed to delete image from blob storage', { url: imageUrl, error: errorMessage });
      }
    }

    // Clear the imageUrl from the item record (keep the item for historical orders)
    await Item.permanentlyRemoveImage(req.params.id);
    
    logger.info('Item image permanently removed', { itemId: req.params.id });
    res.json({ message: 'Item image permanently removed' });
  } catch (error) {
    logger.error('Failed to permanently remove item image', error instanceof Error ? error : new Error(String(error)));
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to permanently remove item image' });
  }
});

export default router;
