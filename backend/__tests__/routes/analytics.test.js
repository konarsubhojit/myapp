import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock dependencies
jest.unstable_mockModule('../../models/Order', () => ({
  default: {
    find: jest.fn(),
  },
}));
jest.unstable_mockModule('../../utils/logger', () => ({
  createLogger: () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }),
}));
// Mock Redis client to return null (disable caching in tests)
jest.unstable_mockModule('../../db/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getRedisIfReady: jest.fn().mockReturnValue(null),
}));

const { default: analyticsRoutes } = await import('../../routes/analytics.js');
const { default: Order } = await import('../../models/Order.js');
const { errorHandler } = await import('../../utils/errorHandler.js');

const app = express();
app.use(express.json());
app.use('/api/analytics', analyticsRoutes);
app.use(errorHandler); // Add global error handler

describe('Analytics Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/analytics/sales', () => {
    it('should return sales analytics with default statusFilter', async () => {
      const mockOrders = [
        {
          orderId: 'ORD001',
          customerId: 'CUST001',
          customerName: 'John Doe',
          orderFrom: 'instagram',
          totalPrice: 100,
          status: 'completed',
          createdAt: new Date().toISOString(),
          items: [{ name: 'Item A', price: 100, quantity: 1 }]
        }
      ];

      Order.find.mockResolvedValue(mockOrders);

      const response = await request(app)
        .get('/api/analytics/sales')
        .expect(200);

      expect(response.body).toHaveProperty('analytics');
      expect(response.body).toHaveProperty('timeRanges');
      expect(response.body).toHaveProperty('generatedAt');
      expect(response.body.timeRanges).toHaveLength(5);
    });

    it('should accept statusFilter=all query parameter', async () => {
      const mockOrders = [
        {
          orderId: 'ORD001',
          customerId: 'CUST001',
          customerName: 'John Doe',
          orderFrom: 'instagram',
          totalPrice: 100,
          status: 'pending',
          createdAt: new Date().toISOString(),
          items: [{ name: 'Item A', price: 100, quantity: 1 }]
        }
      ];

      Order.find.mockResolvedValue(mockOrders);

      const response = await request(app)
        .get('/api/analytics/sales?statusFilter=all')
        .expect(200);

      expect(response.body).toHaveProperty('analytics');
      expect(response.body.analytics.month.orderCount).toBe(1);
    });

    it('should return 400 for invalid statusFilter', async () => {
      const response = await request(app)
        .get('/api/analytics/sales?statusFilter=invalid')
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid statusFilter');
    });

    it('should handle empty orders array', async () => {
      Order.find.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/analytics/sales')
        .expect(200);

      expect(response.body.analytics.month.orderCount).toBe(0);
      expect(response.body.analytics.month.totalSales).toBe(0);
    });

    it('should return correct analytics structure', async () => {
      const now = new Date();
      const mockOrders = [
        {
          orderId: 'ORD001',
          customerId: 'CUST001',
          customerName: 'John Doe',
          orderFrom: 'instagram',
          totalPrice: 150,
          status: 'completed',
          createdAt: now.toISOString(),
          items: [{ name: 'Item A', price: 50, quantity: 3 }]
        }
      ];

      Order.find.mockResolvedValue(mockOrders);

      const response = await request(app)
        .get('/api/analytics/sales')
        .expect(200);

      const monthAnalytics = response.body.analytics.month;
      expect(monthAnalytics).toHaveProperty('totalSales');
      expect(monthAnalytics).toHaveProperty('orderCount');
      expect(monthAnalytics).toHaveProperty('topItems');
      expect(monthAnalytics).toHaveProperty('topItemsByRevenue');
      expect(monthAnalytics).toHaveProperty('sourceBreakdown');
      expect(monthAnalytics).toHaveProperty('topCustomersByOrders');
      expect(monthAnalytics).toHaveProperty('topCustomersByRevenue');
      expect(monthAnalytics).toHaveProperty('highestOrderingCustomer');
      expect(monthAnalytics).toHaveProperty('averageOrderValue');
      expect(monthAnalytics).toHaveProperty('uniqueCustomers');
    });
  });
});
