import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import Order from '@/lib/models/Order';
// @ts-ignore
import { createLogger } from '@/lib/utils/logger';
// @ts-ignore
import { withCache } from '@/lib/middleware/nextCache';

const logger = createLogger('PriorityOrdersAPI');

/**
 * GET /api/orders/priority - Get priority orders based on delivery dates
 * Wrapped with Redis caching (5 minutes TTL)
 */
async function getPriorityOrdersHandler(request: NextRequest) {
  try {
    logger.debug('GET /api/orders/priority request');
    
    const orders = await Order.findPriorityOrders();
    
    // Ensure we always return an array (defensive programming)
    const ordersArray = Array.isArray(orders) ? orders : [];
    
    logger.debug('Returning priority orders', {
      orderCount: ordersArray.length
    });
    
    return NextResponse.json(ordersArray, {
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

// Export GET handler with caching (5 minutes TTL)
export const GET = withCache(getPriorityOrdersHandler, 300);
