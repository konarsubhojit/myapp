import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import Order from '@/lib/models/Order';
// @ts-ignore
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('PriorityOrdersAPI');

/**
 * GET /api/orders/priority - Get priority orders based on delivery dates
 */
export async function GET(request: NextRequest) {
  try {
    logger.debug('GET /api/orders/priority request');
    
    const result = await Order.findPriorityOrders();
    
    logger.debug('Returning priority orders', {
      urgentCount: result.urgent.length,
      upcomingCount: result.upcoming.length,
      overdueCount: result.overdue.length
    });
    
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });
  } catch (error: any) {
    logger.error('GET /api/orders/priority error', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch priority orders' },
      { status: error.statusCode || 500 }
    );
  }
}
