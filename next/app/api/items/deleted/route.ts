import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import Item from '@/lib/models/Item';
import { createLogger } from '@/lib/utils/logger';
import { parsePaginationParams } from '@/lib/utils/pagination';
import { withCache } from '@/lib/middleware/nextCache';

const logger = createLogger('ItemsDeletedAPI');

/**
 * GET /api/items/deleted - Get soft-deleted items with offset pagination
 * Uses Redis caching with version control for proper invalidation
 */
async function getDeletedItemsHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Convert URLSearchParams to object for parsePaginationParams
    const query = {
      page: searchParams.get('page') || '',
      limit: searchParams.get('limit') || '',
      search: searchParams.get('search') || ''
    };
    const { page, limit, search } = parsePaginationParams(query);
    
    logger.debug('GET /api/items/deleted request', { 
      page,
      limit,
      hasSearchParam: !!search
    });
    
    // Use offset-based pagination (matches frontend expectations)
    const result = await Item.findDeletedPaginated({ page, limit, search });
    
    logger.debug('Returning paginated deleted items', {
      itemCount: result.items.length,
      page: result.pagination.page,
      total: result.pagination.total
    });
    
    // No Cache-Control header - rely on Redis caching with version control
    return NextResponse.json(result);
  } catch (error: unknown) {
    logger.error('GET /api/items/deleted error', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch deleted items' },
      { status: (error as { statusCode?: number }).statusCode || 500 }
    );
  }
}

// Export GET handler with Redis caching (5 minutes TTL, invalidated on updates)
export const GET = withCache(getDeletedItemsHandler, 300);
