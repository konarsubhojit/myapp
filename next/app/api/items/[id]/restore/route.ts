import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import Item from '@/lib/models/Item';
// @ts-ignore
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ItemRestoreAPI');

/**
 * POST /api/items/[id]/restore - Restore a soft-deleted item
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await Item.restore(id);
    if (!item) {
      return NextResponse.json(
        { message: 'Item not found' },
        { status: 404 }
      );
    }
    
    logger.info('Item restored', { itemId: id });
    
    return NextResponse.json(item);
  } catch (error: any) {
    logger.error('POST /api/items/[id]/restore error', error);
    return NextResponse.json(
      { message: error.message || 'Failed to restore item' },
      { status: error.statusCode || 500 }
    );
  }
}
