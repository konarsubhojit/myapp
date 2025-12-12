import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock dependencies
jest.unstable_mockModule('../../models/Feedback', () => ({
  default: {
    create: jest.fn(),
    findByOrderId: jest.fn(),
  },
}));
jest.unstable_mockModule('../../models/FeedbackToken', () => ({
  default: {
    validateToken: jest.fn(),
    markAsUsed: jest.fn(),
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

const { default: publicFeedbackRoutes } = await import('../../routes/publicFeedbacks.js');
const { default: Feedback } = await import('../../models/Feedback.js');
const { default: FeedbackToken } = await import('../../models/FeedbackToken.js');
const { default: Order } = await import('../../models/Order.js');
const { errorHandler } = await import('../../utils/errorHandler.js');

const app = express();
app.use(express.json());
app.use('/api/public/feedbacks', publicFeedbackRoutes);
app.use(errorHandler);

describe('Public Feedbacks Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/public/feedbacks/validate-token', () => {
    it('should validate token and return order info', async () => {
      const mockToken = 'valid-token-123';
      const mockTokenData = { id: 1, orderId: 123, token: mockToken };
      const mockOrder = { _id: 123, orderId: 'ORD-123', status: 'completed' };

      FeedbackToken.validateToken.mockResolvedValue(mockTokenData);
      Order.findById.mockResolvedValue(mockOrder);
      Feedback.findByOrderId.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/public/feedbacks/validate-token')
        .send({ token: mockToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('order');
      expect(response.body).toHaveProperty('hasExistingFeedback');
      expect(response.body.order._id).toBe(123);
      expect(response.body.hasExistingFeedback).toBe(false);
    });

    it('should return hasExistingFeedback true if feedback exists', async () => {
      const mockToken = 'valid-token-123';
      const mockTokenData = { id: 1, orderId: 123, token: mockToken };
      const mockOrder = { _id: 123, orderId: 'ORD-123', status: 'completed' };
      const mockFeedback = { _id: 1, orderId: 123, rating: 5 };

      FeedbackToken.validateToken.mockResolvedValue(mockTokenData);
      Order.findById.mockResolvedValue(mockOrder);
      Feedback.findByOrderId.mockResolvedValue(mockFeedback);

      const response = await request(app)
        .post('/api/public/feedbacks/validate-token')
        .send({ token: mockToken });

      expect(response.status).toBe(200);
      expect(response.body.hasExistingFeedback).toBe(true);
    });

    it('should return 400 if token is missing', async () => {
      const response = await request(app)
        .post('/api/public/feedbacks/validate-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 if token is invalid', async () => {
      FeedbackToken.validateToken.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/public/feedbacks/validate-token')
        .send({ token: 'invalid-token' });

      expect(response.status).toBe(401);
    });

    it('should return 404 if order not found', async () => {
      const mockToken = 'valid-token-123';
      const mockTokenData = { id: 1, orderId: 999, token: mockToken };

      FeedbackToken.validateToken.mockResolvedValue(mockTokenData);
      Order.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/public/feedbacks/validate-token')
        .send({ token: mockToken });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/public/feedbacks', () => {
    it('should create feedback with valid token and data', async () => {
      const mockToken = 'valid-token-123';
      const mockTokenData = { id: 1, orderId: 123, token: mockToken };
      const mockOrder = { _id: 123, orderId: 'ORD-123', status: 'completed' };
      const mockFeedback = {
        _id: 1,
        orderId: 123,
        rating: 5,
        comment: 'Great service!',
        productQuality: 5,
        deliveryExperience: 4,
        isPublic: false,
      };

      FeedbackToken.validateToken.mockResolvedValue(mockTokenData);
      Order.findById.mockResolvedValue(mockOrder);
      Feedback.findByOrderId.mockResolvedValue(null);
      Feedback.create.mockResolvedValue(mockFeedback);
      FeedbackToken.markAsUsed.mockResolvedValue();

      const response = await request(app)
        .post('/api/public/feedbacks')
        .send({
          token: mockToken,
          rating: 5,
          comment: 'Great service!',
          productQuality: 5,
          deliveryExperience: 4,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.rating).toBe(5);
      expect(FeedbackToken.markAsUsed).toHaveBeenCalledWith(mockToken);
    });

    it('should create feedback without optional fields', async () => {
      const mockToken = 'valid-token-123';
      const mockTokenData = { id: 1, orderId: 123, token: mockToken };
      const mockOrder = { _id: 123, orderId: 'ORD-123', status: 'completed' };
      const mockFeedback = {
        _id: 1,
        orderId: 123,
        rating: 4,
        comment: '',
        productQuality: null,
        deliveryExperience: null,
        isPublic: false,
      };

      FeedbackToken.validateToken.mockResolvedValue(mockTokenData);
      Order.findById.mockResolvedValue(mockOrder);
      Feedback.findByOrderId.mockResolvedValue(null);
      Feedback.create.mockResolvedValue(mockFeedback);
      FeedbackToken.markAsUsed.mockResolvedValue();

      const response = await request(app)
        .post('/api/public/feedbacks')
        .send({
          token: mockToken,
          rating: 4,
        });

      expect(response.status).toBe(201);
      expect(response.body.rating).toBe(4);
    });

    it('should return 400 if token is missing', async () => {
      const response = await request(app)
        .post('/api/public/feedbacks')
        .send({ rating: 5 });

      expect(response.status).toBe(400);
    });

    it('should return 401 if token is invalid', async () => {
      FeedbackToken.validateToken.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/public/feedbacks')
        .send({ token: 'invalid-token', rating: 5 });

      expect(response.status).toBe(401);
    });

    it('should return 404 if order not found', async () => {
      const mockToken = 'valid-token-123';
      const mockTokenData = { id: 1, orderId: 999, token: mockToken };

      FeedbackToken.validateToken.mockResolvedValue(mockTokenData);
      Order.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/public/feedbacks')
        .send({ token: mockToken, rating: 5 });

      expect(response.status).toBe(404);
    });

    it('should return 400 if order is not completed', async () => {
      const mockToken = 'valid-token-123';
      const mockTokenData = { id: 1, orderId: 123, token: mockToken };
      const mockOrder = { _id: 123, orderId: 'ORD-123', status: 'pending' };

      FeedbackToken.validateToken.mockResolvedValue(mockTokenData);
      Order.findById.mockResolvedValue(mockOrder);

      const response = await request(app)
        .post('/api/public/feedbacks')
        .send({ token: mockToken, rating: 5 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('completed orders');
    });

    it('should return 400 if feedback already exists', async () => {
      const mockToken = 'valid-token-123';
      const mockTokenData = { id: 1, orderId: 123, token: mockToken };
      const mockOrder = { _id: 123, orderId: 'ORD-123', status: 'completed' };
      const existingFeedback = { _id: 1, orderId: 123, rating: 5 };

      FeedbackToken.validateToken.mockResolvedValue(mockTokenData);
      Order.findById.mockResolvedValue(mockOrder);
      Feedback.findByOrderId.mockResolvedValue(existingFeedback);

      const response = await request(app)
        .post('/api/public/feedbacks')
        .send({ token: mockToken, rating: 5 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already exists');
    });

    it('should return 400 if rating is missing', async () => {
      const mockToken = 'valid-token-123';
      const mockTokenData = { id: 1, orderId: 123, token: mockToken };
      const mockOrder = { _id: 123, orderId: 'ORD-123', status: 'completed' };

      FeedbackToken.validateToken.mockResolvedValue(mockTokenData);
      Order.findById.mockResolvedValue(mockOrder);
      Feedback.findByOrderId.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/public/feedbacks')
        .send({ token: mockToken });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('rating is required');
    });

    it('should return 400 if rating is out of range', async () => {
      const mockToken = 'valid-token-123';
      const mockTokenData = { id: 1, orderId: 123, token: mockToken };
      const mockOrder = { _id: 123, orderId: 'ORD-123', status: 'completed' };

      FeedbackToken.validateToken.mockResolvedValue(mockTokenData);
      Order.findById.mockResolvedValue(mockOrder);
      Feedback.findByOrderId.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/public/feedbacks')
        .send({ token: mockToken, rating: 6 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('between');
    });

    it('should return 400 if optional rating is invalid', async () => {
      const mockToken = 'valid-token-123';
      const mockTokenData = { id: 1, orderId: 123, token: mockToken };
      const mockOrder = { _id: 123, orderId: 'ORD-123', status: 'completed' };

      FeedbackToken.validateToken.mockResolvedValue(mockTokenData);
      Order.findById.mockResolvedValue(mockOrder);
      Feedback.findByOrderId.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/public/feedbacks')
        .send({ 
          token: mockToken, 
          rating: 5,
          productQuality: 0 
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Product quality');
    });

    it('should return 400 if comment exceeds max length', async () => {
      const mockToken = 'valid-token-123';
      const mockTokenData = { id: 1, orderId: 123, token: mockToken };
      const mockOrder = { _id: 123, orderId: 'ORD-123', status: 'completed' };

      FeedbackToken.validateToken.mockResolvedValue(mockTokenData);
      Order.findById.mockResolvedValue(mockOrder);
      Feedback.findByOrderId.mockResolvedValue(null);

      const longComment = 'a'.repeat(1001);

      const response = await request(app)
        .post('/api/public/feedbacks')
        .send({ 
          token: mockToken, 
          rating: 5,
          comment: longComment
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Comment');
    });
  });
});
