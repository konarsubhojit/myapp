import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
// @ts-ignore
import Item from '@/lib/models/Item';
// @ts-ignore
import { createLogger } from '@/lib/utils/logger';
// @ts-ignore
import { PAGINATION } from '@/lib/constants/paginationConstants';

const logger = createLogger('ItemsDeletedAPI');

const ALLOWED_LIMITS = new Set(PAGINATION.ALLOWED_LIMITS);

function parseCursorParams(searchParams: URLSearchParams) {
  const parsedLimit = Number.parseInt(searchParams.get('limit') || '', 10);
  
  return {
    limit: ALLOWED_LIMITS.has(parsedLimit) ? parsedLimit : PAGINATION.DEFAULT_LIMIT,
    cursor: searchParams.get('cursor') || null as string | null,
    search: searchParams.get('search') || ''
  };
}

/**
 * GET /api/items/deleted - Get soft-deleted items with cursor pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { limit, cursor, search } = parseCursorParams(searchParams);
    
    logger.debug('GET /api/items/deleted request', { 
      hasCursorParam: !!searchParams.get('cursor'),
      hasLimitParam: searchParams.has('limit'),
      hasSearchParam: !!searchParams.get('search')
    });
    
    // @ts-ignore
    const result = await Item.findDeletedCursor({ limit, cursor, search });
    
    logger.debug('Returning cursor-paginated deleted items', {
      itemCount: result.items.length,
      hasMore: result.page.hasMore
    });
    
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200'
      }
    });
  } catch (error: any) {
    logger.error('GET /api/items/deleted error', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch deleted items' },
      { status: error.statusCode || 500 }
    );
  }
}
