import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
// @ts-ignore
import Item from '@/lib/models/Item';
// @ts-ignore
import { createLogger } from '@/lib/utils/logger';
// @ts-ignore
import { parsePaginationParams } from '@/lib/utils/pagination';

const logger = createLogger('ItemsDeletedAPI');

/**
 * GET /api/items/deleted - Get soft-deleted items with offset pagination
 */
export async function GET(request: NextRequest) {
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
