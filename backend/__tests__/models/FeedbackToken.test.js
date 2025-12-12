import { jest } from '@jest/globals';

// Mock the database connection
jest.unstable_mockModule('../../db/connection', () => ({
  getDatabase: jest.fn(),
}));

// Mock tokenUtils
jest.unstable_mockModule('../../utils/tokenUtils', () => ({
  generateFeedbackToken: jest.fn(),
}));

const { getDatabase } = await import('../../db/connection.js');
const { generateFeedbackToken } = await import('../../utils/tokenUtils.js');
const { default: FeedbackToken } = await import('../../models/FeedbackToken.js');

describe('FeedbackToken Model', () => {
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

  describe('generateForOrder', () => {
    it('should generate a new token for an order', async () => {
      const orderId = 123;
      const mockToken = 'abc123def456';
      const mockExpiresAt = new Date('2025-01-15');
      const mockTokenData = {
        id: 1,
        orderId,
        token: mockToken,
        expiresAt: mockExpiresAt,
        used: 0
      };

      generateFeedbackToken.mockReturnValue({
        token: mockToken,
        expiresAt: mockExpiresAt,
      });

      mockDb.insert.mockReturnValue({
        values: jest.fn(() => ({
          returning: jest.fn(() => Promise.resolve([mockTokenData])),
        })),
      });

      const result = await FeedbackToken.generateForOrder(orderId);

      expect(generateFeedbackToken).toHaveBeenCalledWith(30);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toEqual(mockTokenData);
    });

    it('should generate a token with custom expiry days', async () => {
      const orderId = 123;
      const expiryDays = 7;
      const mockToken = 'xyz789';
      const mockExpiresAt = new Date('2025-01-19');
      
      generateFeedbackToken.mockReturnValue({
        token: mockToken,
        expiresAt: mockExpiresAt,
      });

      mockDb.insert.mockReturnValue({
        values: jest.fn(() => ({
          returning: jest.fn(() => Promise.resolve([{
            id: 1,
            orderId,
            token: mockToken,
            expiresAt: mockExpiresAt,
            used: 0
          }])),
        })),
      });

      await FeedbackToken.generateForOrder(orderId, expiryDays);

      expect(generateFeedbackToken).toHaveBeenCalledWith(expiryDays);
    });
  });

  describe('validateToken', () => {
    it('should return token data if valid and not used', async () => {
      const mockToken = 'valid-token';
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      const mockTokenData = {
        id: 1,
        orderId: 123,
        token: mockToken,
        expiresAt: futureDate,
        used: 0
      };

      mockDb.select.mockReturnValue({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([mockTokenData])),
        })),
      });

      const result = await FeedbackToken.validateToken(mockToken);

      expect(result).toEqual(mockTokenData);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should return null if token is not found', async () => {
      const mockToken = 'non-existent-token';

      mockDb.select.mockReturnValue({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([])),
        })),
      });

      const result = await FeedbackToken.validateToken(mockToken);

      expect(result).toBeNull();
    });

    it('should return null if token is expired', async () => {
      const mockToken = 'expired-token';
      const pastDate = new Date('2020-01-01');
      
      mockDb.select.mockReturnValue({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([])),
        })),
      });

      const result = await FeedbackToken.validateToken(mockToken);

      expect(result).toBeNull();
    });

    it('should return null if token is already used', async () => {
      const mockToken = 'used-token';
      
      mockDb.select.mockReturnValue({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([])),
        })),
      });

      const result = await FeedbackToken.validateToken(mockToken);

      expect(result).toBeNull();
    });
  });

  describe('markAsUsed', () => {
    it('should mark a token as used', async () => {
      const mockToken = 'token-to-mark';

      mockUpdate.mockResolvedValue({});

      await FeedbackToken.markAsUsed(mockToken);

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('getOrCreateForOrder', () => {
    it('should return existing valid token if available', async () => {
      const orderId = 123;
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const existingToken = {
        id: 1,
        orderId,
        token: 'existing-token',
        expiresAt: futureDate,
        used: 0
      };

      mockDb.select.mockReturnValue({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([existingToken])),
        })),
      });

      const result = await FeedbackToken.getOrCreateForOrder(orderId);

      expect(result).toEqual(existingToken);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should generate new token if no valid token exists', async () => {
      const orderId = 123;
      const newToken = {
        id: 2,
        orderId,
        token: 'new-token',
        expiresAt: new Date('2025-02-15'),
        used: 0
      };

      // First call returns empty (no existing token)
      mockDb.select.mockReturnValue({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([])),
        })),
      });

      generateFeedbackToken.mockReturnValue({
        token: newToken.token,
        expiresAt: newToken.expiresAt,
      });

      mockDb.insert.mockReturnValue({
        values: jest.fn(() => ({
          returning: jest.fn(() => Promise.resolve([newToken])),
        })),
      });

      const result = await FeedbackToken.getOrCreateForOrder(orderId);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toEqual(newToken);
    });
  });
});
