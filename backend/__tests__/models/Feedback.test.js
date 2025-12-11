import { jest } from '@jest/globals';

// Mock the database connection
jest.unstable_mockModule('../../db/connection', () => ({
  getDatabase: jest.fn(),
}));

const { getDatabase } = await import('../../db/connection.js');
const { default: Feedback } = await import('../../models/Feedback.js');

describe('Feedback Model', () => {
  let mockDb;
  let mockSelect;
  let mockInsert;
  let mockUpdate;

  beforeEach(() => {
    mockSelect = jest.fn();
    mockInsert = jest.fn();
    mockUpdate = jest.fn();

    mockDb = {
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([])),
          orderBy: jest.fn(() => mockSelect),
          limit: jest.fn(() => ({ offset: jest.fn(() => mockSelect) })),
        })),
      })),
      insert: jest.fn(() => ({
        values: jest.fn(() => ({
          returning: jest.fn(() => mockInsert),
        })),
      })),
      update: jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn(() => mockUpdate),
        })),
      })),
    };
    getDatabase.mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('find', () => {
    it('should return all feedbacks', async () => {
      const mockFeedbacks = [
        {
          id: 1,
          orderId: 1,
          rating: 5,
          comment: 'Great product!',
          productQuality: 5,
          deliveryExperience: 4,
          isPublic: 1,
          responseText: null,
          respondedAt: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ];

      mockDb.select.mockReturnValue({
        from: jest.fn(() => ({
          orderBy: jest.fn(() => Promise.resolve(mockFeedbacks))
        }))
      });

      const result = await Feedback.find();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        _id: 1,
        rating: 5,
        comment: 'Great product!'
      });
    });
  });

  describe('findPaginated', () => {
    it('should return paginated feedbacks', async () => {
      const mockFeedbacks = [
        {
          id: 1,
          orderId: 1,
          rating: 5,
          comment: 'Great product!',
          productQuality: 5,
          deliveryExperience: 4,
          isPublic: 1,
          responseText: null,
          respondedAt: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ];

      // Mock count query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn(() => Promise.resolve([{ count: '1' }]))
      });

      // Mock data query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn(() => ({
          orderBy: jest.fn(() => ({
            limit: jest.fn(() => ({
              offset: jest.fn(() => Promise.resolve(mockFeedbacks))
            }))
          }))
        }))
      });

      const result = await Feedback.findPaginated({ page: 1, limit: 10 });

      expect(result.feedbacks).toHaveLength(1);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      });
    });
  });

  describe('findById', () => {
    it('should return feedback by id', async () => {
      const mockFeedback = {
        id: 1,
        orderId: 1,
        rating: 5,
        comment: 'Great product!',
        productQuality: 5,
        deliveryExperience: 4,
        isPublic: 1,
        responseText: null,
        respondedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      };

      mockDb.select.mockReturnValue({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([mockFeedback]))
        }))
      });

      const result = await Feedback.findById(1);

      expect(result).toMatchObject({
        _id: 1,
        rating: 5,
        comment: 'Great product!'
      });
    });

    it('should return null for non-existent feedback', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([]))
        }))
      });

      const result = await Feedback.findById(999);

      expect(result).toBeNull();
    });

    it('should return null for invalid id', async () => {
      const result = await Feedback.findById('invalid');

      expect(result).toBeNull();
    });
  });

  describe('findByOrderId', () => {
    it('should return feedback by order id', async () => {
      const mockFeedback = {
        id: 1,
        orderId: 1,
        rating: 5,
        comment: 'Great product!',
        productQuality: 5,
        deliveryExperience: 4,
        isPublic: 1,
        responseText: null,
        respondedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      };

      mockDb.select.mockReturnValue({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([mockFeedback]))
        }))
      });

      const result = await Feedback.findByOrderId(1);

      expect(result).toMatchObject({
        _id: 1,
        orderId: 1
      });
    });

    it('should return null if no feedback found', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([]))
        }))
      });

      const result = await Feedback.findByOrderId(999);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new feedback', async () => {
      const feedbackData = {
        orderId: 1,
        rating: 5,
        comment: 'Great product!',
        productQuality: 5,
        deliveryExperience: 4,
        isPublic: true
      };

      const mockCreatedFeedback = {
        id: 1,
        orderId: 1,
        rating: 5,
        comment: 'Great product!',
        productQuality: 5,
        deliveryExperience: 4,
        isPublic: 1,
        responseText: null,
        respondedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      };

      mockDb.insert.mockReturnValue({
        values: jest.fn(() => ({
          returning: jest.fn(() => Promise.resolve([mockCreatedFeedback]))
        }))
      });

      const result = await Feedback.create(feedbackData);

      expect(result).toMatchObject({
        _id: 1,
        rating: 5,
        comment: 'Great product!'
      });
    });
  });

  describe('findByIdAndUpdate', () => {
    it('should update a feedback', async () => {
      const mockFeedback = {
        id: 1,
        orderId: 1,
        rating: 5,
        comment: 'Great product!',
        productQuality: 5,
        deliveryExperience: 4,
        isPublic: 1,
        responseText: null,
        respondedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      };

      const updatedFeedback = { ...mockFeedback, rating: 4 };

      mockDb.select.mockReturnValueOnce({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([mockFeedback]))
        }))
      });

      mockUpdate.mockResolvedValue(null);

      mockDb.select.mockReturnValueOnce({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([updatedFeedback]))
        }))
      });

      const result = await Feedback.findByIdAndUpdate(1, { rating: 4 });

      expect(result.rating).toBe(4);
    });

    it('should return null for non-existent feedback', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([]))
        }))
      });

      const result = await Feedback.findByIdAndUpdate(999, { rating: 4 });

      expect(result).toBeNull();
    });
  });

  describe('getAverageRatings', () => {
    it('should return average ratings', async () => {
      const mockStats = [{
        avgRating: 4.5,
        avgProductQuality: 4.3,
        avgDeliveryExperience: 4.7,
        avgCustomerService: 4.8,
        totalFeedbacks: 10
      }];

      mockDb.select.mockReturnValue({
        from: jest.fn(() => Promise.resolve(mockStats))
      });

      const result = await Feedback.getAverageRatings();

      expect(result).toEqual({
        avgRating: '4.50',
        avgProductQuality: '4.30',
        avgDeliveryExperience: '4.70',
        totalFeedbacks: 10
      });
    });
  });

  describe('getFeedbacksByRating', () => {
    it('should return feedbacks by rating', async () => {
      const mockFeedbacks = [
        {
          id: 1,
          orderId: 1,
          rating: 5,
          comment: 'Excellent!',
          productQuality: 5,
          deliveryExperience: 5,
          isPublic: 1,
          responseText: null,
          respondedAt: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ];

      mockDb.select.mockReturnValue({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            orderBy: jest.fn(() => Promise.resolve(mockFeedbacks))
          }))
        }))
      });

      const result = await Feedback.getFeedbacksByRating(5);

      expect(result).toHaveLength(1);
      expect(result[0].rating).toBe(5);
    });
  });
});
