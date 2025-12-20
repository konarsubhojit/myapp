import { NextRequest, NextResponse } from 'next/server';
import Order from '@/lib/models/Order';
import { createLogger } from '@/lib/utils/logger';
import { calculateSalesAnalytics } from '@/lib/services/analyticsService';
import { withCache } from '@/lib/middleware/nextCache';

const logger = createLogger('AnalyticsAPI');

/**
 * GET /api/analytics/sales - Get pre-computed sales analytics data
 * Query params:
 *   - statusFilter: 'completed' (default) or 'all'
 * Wrapped with Redis caching (3 days TTL)
 */
async function getSalesAnalyticsHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('statusFilter') || 'completed';
    
    // Validate statusFilter
    if (statusFilter !== 'completed' && statusFilter !== 'all') {
      return NextResponse.json(
        { message: "Invalid statusFilter. Must be 'completed' or 'all'" },
        { status: 400 }
      );
    }

    logger.info('Fetching sales analytics', { statusFilter });

    // Fetch all orders
    const orders = await Order.find();
    
    // Calculate analytics using the service
    const analyticsData = calculateSalesAnalytics(orders, statusFilter);
    
    logger.info('Sales analytics response prepared', { 
      statusFilter,
      rangeCount: Object.keys(analyticsData.analytics).length 
    });

    return NextResponse.json(analyticsData);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch analytics';
    const errorStatusCode = (error as { statusCode?: number }).statusCode || 500;
    logger.error('GET /api/analytics/sales error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: errorStatusCode }
    );
  }
}

// Export GET handler with Redis caching and stale-while-revalidate
// 3 days fresh (259200s), serve stale for 2 days (172800s) while revalidating
export const GET = withCache(getSalesAnalyticsHandler, 259200, { staleWhileRevalidate: 172800 });
