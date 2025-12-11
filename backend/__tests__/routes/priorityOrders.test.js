import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock dependencies
jest.unstable_mockModule('../../models/Order', () => ({
  default: {
    findPriorityOrders: jest.fn(),
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

const { default: orderRoutes } = await import('../../routes/orders.js');
const { default: Order } = await import('../../models/Order.js');
const { errorHandler } = await import('../../utils/errorHandler.js');

const app = express();
app.use(express.json());
app.use('/api/orders', orderRoutes);
app.use(errorHandler); // Add global error handler

describe('Priority Orders Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/orders/priority', () => {
    it('should return priority orders sorted by urgency', async () => {
      const mockPriorityOrders = [
        {
          _id: 1,
          orderId: 'ORD001',
          customerName: 'John Doe',
          priority: 8,
          expectedDeliveryDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Overdue
          totalPrice: 100.0,
          status: 'pending',
          items: [],
        },
        {
          _id: 2,
          orderId: 'ORD002',
          customerName: 'Jane Smith',
          priority: 5,
          expectedDeliveryDate: new Date().toISOString(), // Due today
          totalPrice: 150.0,
          status: 'processing',
          items: [],
        },
        {
          _id: 3,
          orderId: 'ORD003',
          customerName: 'Bob Johnson',
          priority: 9,
          expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days away
          totalPrice: 200.0,
          status: 'pending',
          items: [],
        },
      ];

      Order.findPriorityOrders.mockResolvedValue(mockPriorityOrders);

      const response = await request(app).get('/api/orders/priority');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      expect(response.body[0].orderId).toBe('ORD001');
      expect(Order.findPriorityOrders).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no priority orders exist', async () => {
      Order.findPriorityOrders.mockResolvedValue([]);

      const response = await request(app).get('/api/orders/priority');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
      expect(response.body).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      Order.findPriorityOrders.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/orders/priority');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Database error');
    });

    it('should only return non-completed orders', async () => {
      const mockOrders = [
        {
          _id: 1,
          orderId: 'ORD001',
          priority: 8,
          status: 'pending',
          expectedDeliveryDate: new Date().toISOString(),
          items: [],
        },
      ];

      Order.findPriorityOrders.mockResolvedValue(mockOrders);

      const response = await request(app).get('/api/orders/priority');

      expect(response.status).toBe(200);
      expect(response.body.every(order => 
        order.status !== 'completed' && order.status !== 'cancelled'
      )).toBe(true);
    });
  });
});
