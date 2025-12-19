import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import Order from '@/lib/models/Order';
// @ts-ignore
import { createLogger } from '@/lib/utils/logger';
// @ts-ignore
import { calculateSalesAnalytics } from '@/lib/services/analyticsService';

const logger = createLogger('AnalyticsAPI');

/**
 * GET /api/analytics/sales - Get pre-computed sales analytics data
 * Query params:
 *   - statusFilter: 'completed' (default) or 'all'
 */
export async function GET(request: NextRequest) {
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

    // No Cache-Control header - analytics data is dynamic
    return NextResponse.json(analyticsData);
  } catch (error: any) {
    logger.error('GET /api/analytics/sales error', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch analytics' },
      { status: error.statusCode || 500 }
    );
  }
}
