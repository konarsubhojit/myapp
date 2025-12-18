import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { put } from '@vercel/blob';
// @ts-ignore - Model files are not fully typed yet
import Item from '@/lib/models/Item';
// @ts-ignore
import { createLogger } from '@/lib/utils/logger';
// @ts-ignore
import { parsePaginationParams } from '@/lib/utils/pagination';
// @ts-ignore
import { withCache } from '@/lib/middleware/nextCache';
// @ts-ignore
import { invalidateItemCache } from '@/lib/middleware/cache';
// @ts-ignore
import { IMAGE_CONFIG } from '@/lib/constants/imageConstants';

const logger = createLogger('ItemsAPI');

async function uploadImage(image: string) {
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

/**
 * GET /api/items - Get all items with offset pagination
 * Wrapped with Redis caching (24 hours TTL)
 */
async function getItemsHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Convert URLSearchParams to object for parsePaginationParams
    const query = {
      page: searchParams.get('page') || '',
      limit: searchParams.get('limit') || '',
      search: searchParams.get('search') || ''
    };
    const { page, limit, search } = parsePaginationParams(query);
    
    logger.debug('GET /api/items request', { 
      page,
      limit,
      hasSearchParam: !!search,
      searchLength: search.length
    });
    
    // Use offset-based pagination (matches frontend expectations)
    const result = await Item.findPaginated({ page, limit, search });
    
    logger.debug('Returning paginated items', { 
      itemCount: result.items.length,
      page: result.pagination.page,
      total: result.pagination.total
    });
    
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200'
      }
    });
  } catch (error: any) {
    logger.error('GET /api/items error', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch items' },
      { status: error.statusCode || 500 }
    );
  }
}

// Export GET handler with caching (24 hours TTL)
export const GET = withCache(getItemsHandler, 86400);

/**
 * POST /api/items - Create a new item
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, price, color, fabric, specialFeatures, image } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { message: 'Item name is required' },
        { status: 400 }
      );
    }

    const parsedPrice = Number.parseFloat(price);
    if (price === undefined || price === null || Number.isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json(
        { message: 'Valid price is required' },
        { status: 400 }
      );
    }

    let imageUrl = '';
    
    if (image && typeof image === 'string' && image.startsWith('data:image/')) {
      try {
        imageUrl = await uploadImage(image);
        logger.info('Image uploaded to blob storage', { url: imageUrl });
      } catch (uploadError: any) {
        logger.error('Image upload failed', uploadError);
        return NextResponse.json(
          { message: uploadError.message },
          { status: 400 }
        );
      }
    }

    const item = await Item.create({
      name: name.trim(),
      price: parsedPrice,
      color: color?.trim() || '',
      fabric: fabric?.trim() || '',
      specialFeatures: specialFeatures?.trim() || '',
      imageUrl
    });

    // Invalidate item cache after creation
    await invalidateItemCache();

    // Revalidate Next.js cache for items pages
    revalidatePath('/api/items');
    revalidatePath('/items');

    logger.info('Item created', { itemId: item.id });
    
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    logger.error('POST /api/items error', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create item' },
      { status: error.statusCode || 500 }
    );
  }
}
