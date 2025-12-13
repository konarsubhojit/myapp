import express from 'express';
const router = express.Router();
import Order from '../models/Order.js';
import { createLogger } from '../utils/logger.js';
import { asyncHandler } from '../utils/errorHandler.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { calculateSalesAnalytics } from '../services/analyticsService.js';

const logger = createLogger('AnalyticsRoute');

/**
 * GET /api/analytics/sales
 * Get pre-computed sales analytics data
 * Query params:
 *   - statusFilter: 'completed' (default) or 'all'
 */
router.get('/sales', cacheMiddleware(60), asyncHandler(async (req, res) => {
  const { statusFilter = 'completed' } = req.query;
  
  // Validate statusFilter
  if (statusFilter !== 'completed' && statusFilter !== 'all') {
    return res.status(400).json({ 
      message: "Invalid statusFilter. Must be 'completed' or 'all'" 
    });
  }

  logger.info('Fetching sales analytics', { statusFilter });

  // Fetch all orders (this call will be cached by the orders route)
  const orders = await Order.find();
  
  // Calculate analytics using the service
  const analyticsData = calculateSalesAnalytics(orders, statusFilter);
  
  logger.info('Sales analytics response prepared', { 
    statusFilter,
    rangeCount: Object.keys(analyticsData.analytics).length 
  });

  res.json(analyticsData);
}));

export default router;
