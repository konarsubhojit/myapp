import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import Item from '@/lib/models/Item';
import { createLogger } from '@/lib/utils/logger';
import { parsePaginationParams } from '@/lib/utils/pagination';
import { withCache } from '@/lib/middleware/nextCache';

const logger = createLogger('ItemsDeletedAPI');

/**
 * GET /api/items/deleted - Get soft-deleted items with cursor or offset pagination
 * Uses Redis caching with version control for proper invalidation
 * Supports both cursor-based (recommended) and offset-based pagination
 */
async function getDeletedItemsHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Check if cursor-based pagination is requested
    const cursorParam = searchParams.get('cursor');
    const hasCursor = cursorParam !== null;
    
    // Convert URLSearchParams to object for parsePaginationParams
    const query = {
      page: searchParams.get('page') || '',
      limit: searchParams.get('limit') || '',
      search: searchParams.get('search') || ''
    };
    const { page, limit, search } = parsePaginationParams(query);
    
    logger.debug('GET /api/items/deleted request', { 
      paginationType: hasCursor ? 'cursor' : 'offset',
      page,
      limit,
      cursor: hasCursor ? 'present' : 'none',
      hasSearchParam: !!search
    });
    
    let result;
    
    if (cursorParam) {
      // Use cursor-based pagination (recommended for scalability)
      // Cast to any to bypass TypeScript's strict parameter checking for JS model
      result = await (Item.findDeletedCursor as any)({ 
        limit, 
        cursor: cursorParam, 
        search 
      }) as { items: unknown[]; pagination: { limit: number; nextCursor: string | null; hasMore: boolean } };
    } else {
      // Use offset-based pagination (legacy, backward compatible)
      result = await Item.findDeletedPaginated({ page, limit, search });
    }
    
    logger.debug('Returning paginated deleted items', {
      itemCount: result.items.length,
      paginationType: hasCursor ? 'cursor' : 'offset',
      ...(hasCursor ? {
        hasMore: result.pagination.hasMore,
        nextCursor: result.pagination.nextCursor ? 'present' : 'null'
      } : {
        page: result.pagination.page,
        total: result.pagination.total
      })
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

// Export GET handler with Redis caching and stale-while-revalidate
// 3 days fresh (259200s), serve stale for 2 days (172800s) while revalidating
export const GET = withCache(getDeletedItemsHandler, 259200, { staleWhileRevalidate: 172800 });
