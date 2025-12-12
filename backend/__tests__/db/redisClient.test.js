import { jest } from '@jest/globals';

// Mock redis module
jest.unstable_mockModule('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    isOpen: true,
  })),
}));

// Mock logger
jest.unstable_mockModule('../../utils/logger', () => ({
  createLogger: () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }),
}));

const redisClientModule = await import('../../db/redisClient.js');
const { createClient } = await import('redis');

describe('Redis Client', () => {
  const originalEnv = process.env.REDIS_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the module state by calling closeRedisClient
    if (redisClientModule.closeRedisClient) {
      redisClientModule.closeRedisClient();
    }
  });

  afterEach(() => {
    process.env.REDIS_URL = originalEnv;
  });

  describe('getRedisClient', () => {
    it('should return null when REDIS_URL is not configured', async () => {
      delete process.env.REDIS_URL;
      const client = await redisClientModule.getRedisClient();
      expect(client).toBeNull();
    });

    it('should create and connect to Redis when URL is configured', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      
      const mockClient = {
        connect: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
        isOpen: true,
      };
      
      createClient.mockReturnValue(mockClient);

      const client = await redisClientModule.getRedisClient();
      
      expect(createClient).toHaveBeenCalledWith(expect.objectContaining({
        url: 'redis://localhost:6379',
      }));
      expect(mockClient.connect).toHaveBeenCalled();
      expect(client).toBe(mockClient);
    });

    it('should handle Redis connection errors gracefully', async () => {
      process.env.REDIS_URL = 'redis://invalid:6379';
      
      const mockClient = {
        connect: jest.fn().mockRejectedValue(new Error('Connection failed')),
        on: jest.fn(),
        isOpen: false,
      };
      
      createClient.mockReturnValue(mockClient);

      const client = await redisClientModule.getRedisClient();
      
      expect(client).toBeNull();
    });
  });

  describe('isRedisConnected', () => {
    it('should return false when Redis is not connected', async () => {
      delete process.env.REDIS_URL;
      await redisClientModule.closeRedisClient();
      const connected = redisClientModule.isRedisConnected();
      expect(connected).toBe(false);
    });

    it('should return true when Redis is connected', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      
      const mockClient = {
        connect: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
        isOpen: true,
      };
      
      createClient.mockReturnValue(mockClient);

      await redisClientModule.getRedisClient();
      const connected = redisClientModule.isRedisConnected();
      expect(connected).toBe(true);
    });
  });

  describe('closeRedisClient', () => {
    it('should close the Redis connection gracefully', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      
      const mockClient = {
        connect: jest.fn().mockResolvedValue(undefined),
        quit: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
        isOpen: true,
      };
      
      createClient.mockReturnValue(mockClient);

      await redisClientModule.getRedisClient();
      await redisClientModule.closeRedisClient();
      
      expect(mockClient.quit).toHaveBeenCalled();
    });

    it('should not error when closing without connection', async () => {
      await expect(redisClientModule.closeRedisClient()).resolves.not.toThrow();
    });
  });
});
