import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
// @ts-ignore - Model files are not fully typed yet
import Item from '@/lib/models/Item';
// @ts-ignore
import { createLogger } from '@/lib/utils/logger';
// @ts-ignore
import { PAGINATION } from '@/lib/constants/paginationConstants';
// @ts-ignore
import { IMAGE_CONFIG } from '@/lib/constants/imageConstants';

const logger = createLogger('ItemsAPI');

const ALLOWED_LIMITS = new Set(PAGINATION.ALLOWED_LIMITS);

/**
 * Parse and validate cursor pagination parameters from query string
 */
function parseCursorParams(searchParams: URLSearchParams) {
  const parsedLimit = Number.parseInt(searchParams.get('limit') || '', 10);
  
  return {
    limit: ALLOWED_LIMITS.has(parsedLimit) ? parsedLimit : PAGINATION.DEFAULT_LIMIT,
    cursor: searchParams.get('cursor') || null as string | null,
    search: searchParams.get('search') || ''
  };
}

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
 * GET /api/items - Get all items with cursor pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { limit, cursor, search } = parseCursorParams(searchParams);
    
    logger.debug('GET /api/items request', { 
      hasCursorParam: !!searchParams.get('cursor'),
      hasLimitParam: searchParams.has('limit'),
      limitValue: searchParams.get('limit'),
      hasSearchParam: !!searchParams.get('search'),
      searchLength: searchParams.get('search')?.length
    });
    
    // @ts-ignore - cursor type mismatch between URLSearchParams and model
    const result = await Item.findCursor({ limit, cursor, search });
    
    logger.debug('Returning cursor-paginated response', { 
      itemCount: result.items.length,
      hasMore: result.page.hasMore,
      nextCursor: result.page.nextCursor ? 'present' : 'null'
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

    logger.info('Item created', { itemId: item.id });
    
    // Invalidate cache
    // In Next.js, we can use revalidateTag or revalidatePath
    // For now, we'll just return the response
    
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    logger.error('POST /api/items error', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create item' },
      { status: error.statusCode || 500 }
    );
  }
}
