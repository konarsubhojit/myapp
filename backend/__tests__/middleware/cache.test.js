import { jest } from '@jest/globals';

// Mock Redis client
const mockRedisClient = {
  get: jest.fn(),
  setEx: jest.fn(),
  scan: jest.fn(),
  del: jest.fn(),
  flushDb: jest.fn(),
  isOpen: true,
};

jest.unstable_mockModule('../../db/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(mockRedisClient),
}));

jest.unstable_mockModule('../../utils/logger', () => ({
  createLogger: () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }),
}));

const { cacheMiddleware, generateCacheKey, invalidateCache, invalidateItemCache, invalidateOrderCache, clearAllCache } = await import('../../middleware/cache.js');
const { getRedisClient } = await import('../../db/redisClient.js');

describe('Cache Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      method: 'GET',
      path: '/api/items',
      query: {},
    };
    
    res = {
      json: jest.fn().mockReturnThis(),
    };
    
    next = jest.fn();
  });

  describe('generateCacheKey', () => {
    it('should generate cache key from path', () => {
      const key = generateCacheKey(req);
      expect(key).toBe('/api/items');
    });

    it('should include sorted query parameters', () => {
      req.query = { page: '1', limit: '10', search: 'test' };
      const key = generateCacheKey(req);
      expect(key).toBe('/api/items?limit=10&page=1&search=test');
    });
  });

  describe('cacheMiddleware', () => {
    it('should skip caching for non-GET requests', async () => {
      req.method = 'POST';
      const middleware = cacheMiddleware(300);
      
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('should return cached data on cache hit', async () => {
      const cachedData = { items: [{ id: 1, name: 'Test' }] };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));
      
      const middleware = cacheMiddleware(300);
      await middleware(req, res, next);
      
      expect(mockRedisClient.get).toHaveBeenCalledWith('/api/items');
      expect(res.json).toHaveBeenCalledWith(cachedData);
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next on cache miss and cache the response', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const middleware = cacheMiddleware(300);
      await middleware(req, res, next);
      
      expect(mockRedisClient.get).toHaveBeenCalledWith('/api/items');
      expect(next).toHaveBeenCalled();
      
      // Simulate response
      const responseData = { items: [] };
      res.json(responseData);
      
      // Wait for async cache operation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        '/api/items',
        300,
        JSON.stringify(responseData)
      );
    });

    it('should continue without caching when Redis is not available', async () => {
      getRedisClient.mockResolvedValueOnce(null);
      
      const middleware = cacheMiddleware(300);
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));
      
      const middleware = cacheMiddleware(300);
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
  });

  describe('invalidateCache', () => {
    it('should delete all keys matching the pattern using SCAN', async () => {
      const keys = ['/api/items', '/api/items?page=1', '/api/items?page=2'];
      // Mock SCAN to return all keys in first iteration
      mockRedisClient.scan.mockResolvedValue({
        cursor: 0,
        keys: keys
      });
      mockRedisClient.del.mockResolvedValue(3);
      
      await invalidateCache('/api/items*');
      
      expect(mockRedisClient.scan).toHaveBeenCalledWith(0, {
        MATCH: '/api/items*',
        COUNT: 100
      });
      expect(mockRedisClient.del).toHaveBeenCalledWith(keys);
    });

    it('should handle pagination in SCAN', async () => {
      // Mock SCAN to return keys in multiple iterations
      mockRedisClient.scan
        .mockResolvedValueOnce({
          cursor: 1,
          keys: ['/api/items?page=1']
        })
        .mockResolvedValueOnce({
          cursor: 0,
          keys: ['/api/items?page=2']
        });
      mockRedisClient.del.mockResolvedValue(2);
      
      await invalidateCache('/api/items*');
      
      expect(mockRedisClient.scan).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.del).toHaveBeenCalledWith(['/api/items?page=1', '/api/items?page=2']);
    });

    it('should handle no matching keys', async () => {
      mockRedisClient.scan.mockResolvedValue({
        cursor: 0,
        keys: []
      });
      
      await invalidateCache('/api/items*');
      
      expect(mockRedisClient.scan).toHaveBeenCalledWith(0, {
        MATCH: '/api/items*',
        COUNT: 100
      });
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should continue when Redis is not available', async () => {
      getRedisClient.mockResolvedValueOnce(null);
      
      await invalidateCache('/api/items*');
      
      expect(mockRedisClient.scan).not.toHaveBeenCalled();
    });
  });

  describe('invalidateItemCache', () => {
    it('should invalidate all item-related caches', async () => {
      mockRedisClient.scan.mockResolvedValue({
        cursor: 0,
        keys: []
      });
      
      await invalidateItemCache();
      
      expect(mockRedisClient.scan).toHaveBeenCalledWith(0, {
        MATCH: '/api/items*',
        COUNT: 100
      });
    });
  });

  describe('invalidateOrderCache', () => {
    it('should invalidate all order-related caches', async () => {
      mockRedisClient.scan.mockResolvedValue({
        cursor: 0,
        keys: []
      });
      
      await invalidateOrderCache();
      
      expect(mockRedisClient.scan).toHaveBeenCalledWith(0, {
        MATCH: '/api/orders*',
        COUNT: 100
      });
    });
  });

  describe('clearAllCache', () => {
    it('should clear all caches', async () => {
      mockRedisClient.flushDb.mockResolvedValue('OK');
      
      await clearAllCache();
      
      expect(mockRedisClient.flushDb).toHaveBeenCalled();
    });

    it('should continue when Redis is not available', async () => {
      getRedisClient.mockResolvedValueOnce(null);
      
      await clearAllCache();
      
      expect(mockRedisClient.flushDb).not.toHaveBeenCalled();
    });
  });
});
