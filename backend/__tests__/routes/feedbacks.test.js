import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock dependencies
jest.unstable_mockModule('../../models/Feedback', () => ({
  default: {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
    findPaginated: jest.fn(),
    findByOrderId: jest.fn(),
    getAverageRatings: jest.fn(),
  },
}));
jest.unstable_mockModule('../../models/FeedbackToken', () => ({
  default: {
    getOrCreateForOrder: jest.fn(),
  },
}));
jest.unstable_mockModule('../../models/Order', () => ({
  default: {
    findById: jest.fn(),
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

const { default: feedbackRoutes } = await import('../../routes/feedbacks.js');
const { default: Feedback } = await import('../../models/Feedback.js');
const { default: FeedbackToken } = await import('../../models/FeedbackToken.js');
const { default: Order } = await import('../../models/Order.js');
const { errorHandler } = await import('../../utils/errorHandler.js');

const app = express();
app.use(express.json());
app.use('/api/feedbacks', feedbackRoutes);
app.use(errorHandler);

describe('Feedbacks Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/feedbacks/generate-token/:orderId', () => {
    it('should generate token for completed order', async () => {
      const mockOrder = { _id: 123, orderId: 'ORD-123', status: 'completed' };
      const mockToken = {
        id: 1,
        orderId: 123,
        token: 'abc123def456',
        expiresAt: new Date('2025-02-15'),
      };

      Order.findById.mockResolvedValue(mockOrder);
      Feedback.findByOrderId.mockResolvedValue(null);
      FeedbackToken.getOrCreateForOrder.mockResolvedValue(mockToken);

      const response = await request(app)
        .post('/api/feedbacks/generate-token/123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.token).toBe(mockToken.token);
    });

    it('should return 404 if order not found', async () => {
      Order.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/feedbacks/generate-token/999');

      expect(response.status).toBe(404);
    });

    it('should return 400 if order is not completed', async () => {
      const mockOrder = { _id: 123, orderId: 'ORD-123', status: 'pending' };

      Order.findById.mockResolvedValue(mockOrder);

      const response = await request(app)
        .post('/api/feedbacks/generate-token/123');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('completed');
    });

    it('should return 400 if feedback already exists', async () => {
      const mockOrder = { _id: 123, orderId: 'ORD-123', status: 'completed' };
      const mockFeedback = { _id: 1, orderId: 123, rating: 5 };

      Order.findById.mockResolvedValue(mockOrder);
      Feedback.findByOrderId.mockResolvedValue(mockFeedback);

      const response = await request(app)
        .post('/api/feedbacks/generate-token/123');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already submitted');
    });
  });

  describe('GET /api/feedbacks', () => {
    it('should return all feedbacks without pagination', async () => {
      const mockFeedbacks = [
        { _id: 1, orderId: 123, rating: 5 },
        { _id: 2, orderId: 124, rating: 4 },
      ];

      Feedback.find.mockResolvedValue(mockFeedbacks);

      const response = await request(app).get('/api/feedbacks');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should return paginated feedbacks', async () => {
      const mockResult = {
        feedbacks: [{ _id: 1, orderId: 123, rating: 5 }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };

      Feedback.findPaginated.mockResolvedValue(mockResult);

      const response = await request(app).get('/api/feedbacks?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('feedbacks');
      expect(response.body).toHaveProperty('pagination');
    });
  });

  describe('GET /api/feedbacks/order/:orderId', () => {
    it('should return feedback for a specific order', async () => {
      const mockFeedback = { _id: 1, orderId: 123, rating: 5 };

      Feedback.findByOrderId.mockResolvedValue(mockFeedback);

      const response = await request(app).get('/api/feedbacks/order/123');

      expect(response.status).toBe(200);
      expect(response.body._id).toBe(1);
    });

    it('should return 404 if feedback not found', async () => {
      Feedback.findByOrderId.mockResolvedValue(null);

      const response = await request(app).get('/api/feedbacks/order/999');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/feedbacks/stats', () => {
    it('should return feedback statistics', async () => {
      const mockStats = {
        avgRating: '4.5',
        avgProductQuality: '4.7',
        avgDeliveryExperience: '4.3',
        totalFeedbacks: 10,
      };

      Feedback.getAverageRatings.mockResolvedValue(mockStats);

      const response = await request(app).get('/api/feedbacks/stats');

      expect(response.status).toBe(200);
      expect(response.body.avgRating).toBe('4.5');
      expect(response.body.totalFeedbacks).toBe(10);
    });
  });

  describe('GET /api/feedbacks/:id', () => {
    it('should return a specific feedback', async () => {
      const mockFeedback = { _id: 1, orderId: 123, rating: 5 };

      Feedback.findById.mockResolvedValue(mockFeedback);

      const response = await request(app).get('/api/feedbacks/1');

      expect(response.status).toBe(200);
      expect(response.body._id).toBe(1);
    });

    it('should return 404 if feedback not found', async () => {
      Feedback.findById.mockResolvedValue(null);

      const response = await request(app).get('/api/feedbacks/999');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/feedbacks', () => {
    it('should create feedback with all fields', async () => {
      const mockOrder = { _id: 123, orderId: 'ORD-123', status: 'completed' };
      const mockFeedback = {
        _id: 1,
        orderId: 123,
        rating: 5,
        comment: 'Great!',
        productQuality: 5,
        deliveryExperience: 4,
        isPublic: true,
      };

      Order.findById.mockResolvedValue(mockOrder);
      Feedback.findByOrderId.mockResolvedValue(null);
      Feedback.create.mockResolvedValue(mockFeedback);

      const response = await request(app)
        .post('/api/feedbacks')
        .send({
          orderId: 123,
          rating: 5,
          comment: 'Great!',
          productQuality: 5,
          deliveryExperience: 4,
          isPublic: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.rating).toBe(5);
    });

    it('should create feedback with minimal fields', async () => {
      const mockOrder = { _id: 123, orderId: 'ORD-123', status: 'completed' };
      const mockFeedback = {
        _id: 1,
        orderId: 123,
        rating: 3,
        comment: '',
        productQuality: null,
        deliveryExperience: null,
        isPublic: true,
      };

      Order.findById.mockResolvedValue(mockOrder);
      Feedback.findByOrderId.mockResolvedValue(null);
      Feedback.create.mockResolvedValue(mockFeedback);

      const response = await request(app)
        .post('/api/feedbacks')
        .send({
          orderId: 123,
          rating: 3,
        });

      expect(response.status).toBe(201);
    });

    it('should return 400 if orderId is missing', async () => {
      const response = await request(app)
        .post('/api/feedbacks')
        .send({ rating: 5 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Order ID');
    });

    it('should return 404 if order not found', async () => {
      Order.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/feedbacks')
        .send({ orderId: 999, rating: 5 });

      expect(response.status).toBe(404);
    });

    it('should return 400 if order is not completed', async () => {
      const mockOrder = { _id: 123, orderId: 'ORD-123', status: 'processing' };

      Order.findById.mockResolvedValue(mockOrder);

      const response = await request(app)
        .post('/api/feedbacks')
        .send({ orderId: 123, rating: 5 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('completed');
    });

    it('should return 400 if feedback already exists', async () => {
      const mockOrder = { _id: 123, orderId: 'ORD-123', status: 'completed' };
      const existingFeedback = { _id: 1, orderId: 123, rating: 5 };

      Order.findById.mockResolvedValue(mockOrder);
      Feedback.findByOrderId.mockResolvedValue(existingFeedback);

      const response = await request(app)
        .post('/api/feedbacks')
        .send({ orderId: 123, rating: 5 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already exists');
    });

    it('should return 400 if rating is missing', async () => {
      const mockOrder = { _id: 123, orderId: 'ORD-123', status: 'completed' };

      Order.findById.mockResolvedValue(mockOrder);
      Feedback.findByOrderId.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/feedbacks')
        .send({ orderId: 123 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('rating');
    });

    it('should return 400 if rating is out of range', async () => {
      const mockOrder = { _id: 123, orderId: 'ORD-123', status: 'completed' };

      Order.findById.mockResolvedValue(mockOrder);
      Feedback.findByOrderId.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/feedbacks')
        .send({ orderId: 123, rating: 6 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('between');
    });

    it('should return 400 if productQuality is invalid', async () => {
      const mockOrder = { _id: 123, orderId: 'ORD-123', status: 'completed' };

      Order.findById.mockResolvedValue(mockOrder);
      Feedback.findByOrderId.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/feedbacks')
        .send({ orderId: 123, rating: 5, productQuality: 0 });

      expect(response.status).toBe(400);
    });

    it('should return 400 if comment exceeds max length', async () => {
      const mockOrder = { _id: 123, orderId: 'ORD-123', status: 'completed' };

      Order.findById.mockResolvedValue(mockOrder);
      Feedback.findByOrderId.mockResolvedValue(null);

      const longComment = 'a'.repeat(1001);

      const response = await request(app)
        .post('/api/feedbacks')
        .send({ orderId: 123, rating: 5, comment: longComment });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Comment');
    });
  });

  describe('PUT /api/feedbacks/:id', () => {
    it('should update feedback with all fields', async () => {
      const mockFeedback = {
        _id: 1,
        orderId: 123,
        rating: 4,
        comment: 'Updated!',
        productQuality: 4,
        deliveryExperience: 5,
        isPublic: false,
        responseText: 'Thank you!',
      };

      Feedback.findByIdAndUpdate.mockResolvedValue(mockFeedback);

      const response = await request(app)
        .put('/api/feedbacks/1')
        .send({
          rating: 4,
          comment: 'Updated!',
          productQuality: 4,
          deliveryExperience: 5,
          isPublic: false,
          responseText: 'Thank you!',
        });

      expect(response.status).toBe(200);
      expect(response.body.rating).toBe(4);
    });

    it('should update feedback with partial fields', async () => {
      const mockFeedback = {
        _id: 1,
        orderId: 123,
        rating: 5,
        comment: 'Partial update',
        productQuality: 5,
        deliveryExperience: 4,
        isPublic: true,
      };

      Feedback.findByIdAndUpdate.mockResolvedValue(mockFeedback);

      const response = await request(app)
        .put('/api/feedbacks/1')
        .send({ comment: 'Partial update' });

      expect(response.status).toBe(200);
    });

    it('should return 404 if feedback not found', async () => {
      Feedback.findByIdAndUpdate.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/feedbacks/999')
        .send({ rating: 5 });

      expect(response.status).toBe(404);
    });

    it('should return 400 if rating is invalid', async () => {
      const response = await request(app)
        .put('/api/feedbacks/1')
        .send({ rating: 6 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('between');
    });

    it('should return 400 if productQuality is invalid', async () => {
      const response = await request(app)
        .put('/api/feedbacks/1')
        .send({ productQuality: 0 });

      expect(response.status).toBe(400);
    });

    it('should return 400 if comment exceeds max length', async () => {
      const longComment = 'a'.repeat(1001);

      const response = await request(app)
        .put('/api/feedbacks/1')
        .send({ comment: longComment });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Comment');
    });

    it('should return 400 if responseText exceeds max length', async () => {
      const longResponse = 'a'.repeat(1001);

      const response = await request(app)
        .put('/api/feedbacks/1')
        .send({ responseText: longResponse });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Response');
    });
  });
});
