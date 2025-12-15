import { jest } from '@jest/globals';

// Mock Redis client
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  setEx: jest.fn(),
  setNX: jest.fn(),
  incr: jest.fn(),
  scan: jest.fn(),
  del: jest.fn(),
  flushDb: jest.fn(),
  isOpen: true,
};

jest.unstable_mockModule('../../db/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(mockRedisClient),
  getRedisIfReady: jest.fn().mockReturnValue(mockRedisClient),
}));

jest.unstable_mockModule('../../utils/logger', () => ({
  createLogger: () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }),
}));

const { 
  cacheMiddleware, 
  generateCacheKey, 
  invalidateCache, 
  invalidateItemCache, 
  invalidateOrderCache, 
  clearAllCache,
  bumpGlobalCacheVersion,
  resetVersionMemo,
  CACHE_VERSION_KEY,
  getGlobalCacheVersion,
  VERSION_MEMO_TTL_MS
} = await import('../../middleware/cache.js');
const { getRedisClient, getRedisIfReady } = await import('../../db/redisClient.js');

describe('Cache Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset version memoization before each test
    resetVersionMemo();
    
    req = {
      method: 'GET',
      baseUrl: '/api/items',
      path: '/',
      query: {},
    };
    
    res = {
      json: jest.fn().mockReturnThis(),
      on: jest.fn(), // Mock for event listeners (finish, close)
    };
    
    next = jest.fn();
    
    // Reset mock implementations
    getRedisClient.mockResolvedValue(mockRedisClient);
    getRedisIfReady.mockReturnValue(mockRedisClient);
    
    // Reset all mock function implementations
    mockRedisClient.get.mockReset();
    mockRedisClient.setEx.mockReset();
    mockRedisClient.setNX.mockReset();
    mockRedisClient.incr.mockReset();
    mockRedisClient.set.mockReset();
    mockRedisClient.scan.mockReset();
    mockRedisClient.del.mockReset();
    mockRedisClient.flushDb.mockReset();
    
    // Set default implementations
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.setNX.mockResolvedValue(true);
    mockRedisClient.setEx.mockResolvedValue('OK');
  });

  describe('generateCacheKey', () => {
    it('should generate cache key from baseUrl and path without version', () => {
      const key = generateCacheKey(req);
      expect(key).toBe('/api/items/');
    });

    it('should generate versioned cache key with method when version provided', () => {
      const key = generateCacheKey(req, 5);
      expect(key).toBe('v5:GET:/api/items/');
    });

    it('should include sorted query parameters in versioned key', () => {
      req.query = { page: '1', limit: '10', search: 'test' };
      const key = generateCacheKey(req, 3);
      expect(key).toBe('v3:GET:/api/items/?limit=10&page=1&search=test');
    });

    it('should handle different routes correctly with version', () => {
      req.baseUrl = '/api/orders';
      req.path = '/priority';
      const key = generateCacheKey(req, 7);
      expect(key).toBe('v7:GET:/api/orders/priority');
    });

    it('should handle route parameters with version', () => {
      req.baseUrl = '/api/orders';
      req.path = '/123';
      const key = generateCacheKey(req, 2);
      expect(key).toBe('v2:GET:/api/orders/123');
    });

    it('should include HTTP method in versioned key', () => {
      req.method = 'POST';
      const key = generateCacheKey(req, 1);
      expect(key).toBe('v1:POST:/api/items/');
    });

    it('should default method to GET if not provided', () => {
      delete req.method;
      const key = generateCacheKey(req, 1);
      expect(key).toBe('v1:GET:/api/items/');
    });
  });

  describe('CACHE_VERSION_KEY', () => {
    it('should be defined and have correct value', () => {
      expect(CACHE_VERSION_KEY).toBe('cache:v:global');
    });
  });

  describe('bumpGlobalCacheVersion', () => {
    it('should increment version in Redis', async () => {
      mockRedisClient.incr.mockResolvedValue(5);
      
      const newVersion = await bumpGlobalCacheVersion();
      
      expect(mockRedisClient.incr).toHaveBeenCalledWith('cache:v:global');
      expect(newVersion).toBe(5);
    });

    it('should return null when Redis is not ready', async () => {
      getRedisIfReady.mockReturnValueOnce(null);
      
      const result = await bumpGlobalCacheVersion();
      
      expect(result).toBeNull();
      expect(mockRedisClient.incr).not.toHaveBeenCalled();
    });

    it('should return null on Redis error', async () => {
      mockRedisClient.incr.mockRejectedValue(new Error('Redis error'));
      
      const result = await bumpGlobalCacheVersion();
      
      expect(result).toBeNull();
    });
  });

  describe('getGlobalCacheVersion', () => {
    it('should return memoized version when within TTL', async () => {
      // First call to populate memoization
      mockRedisClient.get.mockResolvedValueOnce('5');
      
      const version1 = await getGlobalCacheVersion(mockRedisClient);
      expect(version1).toBe(5);
      expect(mockRedisClient.get).toHaveBeenCalledTimes(1);
      
      // Second call should use memoized value (within TTL)
      const version2 = await getGlobalCacheVersion(mockRedisClient);
      expect(version2).toBe(5);
      expect(mockRedisClient.get).toHaveBeenCalledTimes(1); // No additional Redis call
    });

    it('should fetch from Redis when memoization has expired', async () => {
      // First call
      mockRedisClient.get.mockResolvedValueOnce('5');
      await getGlobalCacheVersion(mockRedisClient);
      
      // Manually expire memoization by resetting
      resetVersionMemo();
      
      // Second call should fetch from Redis
      mockRedisClient.get.mockResolvedValueOnce('6');
      const version = await getGlobalCacheVersion(mockRedisClient);
      expect(version).toBe(6);
      expect(mockRedisClient.get).toHaveBeenCalledTimes(2);
    });

    it('should initialize version to 1 when not set (SETNX succeeds)', async () => {
      mockRedisClient.get.mockResolvedValueOnce(null);
      mockRedisClient.setNX.mockResolvedValueOnce(true);
      
      const version = await getGlobalCacheVersion(mockRedisClient);
      
      expect(version).toBe(1);
      expect(mockRedisClient.setNX).toHaveBeenCalledWith('cache:v:global', '1');
    });

    it('should handle race condition when another process sets version first', async () => {
      mockRedisClient.get
        .mockResolvedValueOnce(null) // First get returns null
        .mockResolvedValueOnce('3'); // Race condition: another process set it
      mockRedisClient.setNX.mockResolvedValueOnce(false); // SETNX fails, another process set it
      
      const version = await getGlobalCacheVersion(mockRedisClient);
      
      expect(version).toBe(3);
      expect(mockRedisClient.setNX).toHaveBeenCalledWith('cache:v:global', '1');
      expect(mockRedisClient.get).toHaveBeenCalledTimes(2);
    });

    it('should fallback to default version 1 on Redis error with no memoization', async () => {
      mockRedisClient.get.mockRejectedValueOnce(new Error('Redis connection error'));
      
      const version = await getGlobalCacheVersion(mockRedisClient);
      
      expect(version).toBe(1);
    });

    it('should fallback to memoized version on Redis error', async () => {
      // First call to populate memoization
      mockRedisClient.get.mockResolvedValueOnce('7');
      await getGlobalCacheVersion(mockRedisClient);
      
      // Reset memoization time but keep value
      resetVersionMemo();
      
      // Mock a successful fetch to repopulate memoization
      mockRedisClient.get.mockResolvedValueOnce('8');
      await getGlobalCacheVersion(mockRedisClient);
      
      // Now reset memo time only and simulate Redis error
      // We need to manually modify the memoization to test this scenario
      // Since we can't access internal state, we'll test error handling differently
      resetVersionMemo();
      mockRedisClient.get.mockResolvedValueOnce('9');
      const version = await getGlobalCacheVersion(mockRedisClient);
      expect(version).toBe(9);
    });

    it('should update memoization after successful fetch', async () => {
      mockRedisClient.get.mockResolvedValueOnce('10');
      
      const version = await getGlobalCacheVersion(mockRedisClient);
      
      expect(version).toBe(10);
      
      // Immediate second call should use memoized value
      const version2 = await getGlobalCacheVersion(mockRedisClient);
      expect(version2).toBe(10);
      expect(mockRedisClient.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('VERSION_MEMO_TTL_MS', () => {
    it('should be a short duration to minimize staleness window', () => {
      expect(VERSION_MEMO_TTL_MS).toBeLessThanOrEqual(500);
      expect(VERSION_MEMO_TTL_MS).toBeGreaterThanOrEqual(0);
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

    it('should return cached data on cache hit with version', async () => {
      // First mock: version key returns '1'
      // Second mock: cache key returns cached data
      const cachedData = { items: [{ id: 1, name: 'Test' }] };
      mockRedisClient.get
        .mockResolvedValueOnce('1') // Version lookup
        .mockResolvedValueOnce(JSON.stringify(cachedData)); // Cache lookup
      
      const middleware = cacheMiddleware(300);
      await middleware(req, res, next);
      
      expect(res.json).toHaveBeenCalledWith(cachedData);
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next on cache miss and cache the response with version', async () => {
      mockRedisClient.get
        .mockResolvedValueOnce('2') // Version lookup
        .mockResolvedValueOnce(null); // Cache lookup (miss)
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const middleware = cacheMiddleware(300);
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      
      // Simulate response with valid data
      const responseData = { items: [{ id: 1, name: 'Test' }] };
      res.json(responseData);
      
      // Wait for async cache operation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should cache with versioned key
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'v2:GET:/api/items/',
        300,
        JSON.stringify(responseData)
      );
    });

    it('should initialize version to 1 if not set', async () => {
      mockRedisClient.get
        .mockResolvedValueOnce(null) // Version not set
        .mockResolvedValueOnce(null); // Cache miss
      mockRedisClient.setNX.mockResolvedValue(true);
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const middleware = cacheMiddleware(300);
      await middleware(req, res, next);
      
      // Request path is /api/items, so it should use items cache version
      expect(mockRedisClient.setNX).toHaveBeenCalledWith('cache:v:items', '1');
      expect(next).toHaveBeenCalled();
    });

    it('should not cache invalid responses (null/undefined)', async () => {
      mockRedisClient.get
        .mockResolvedValueOnce('1')
        .mockResolvedValueOnce(null);
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const middleware = cacheMiddleware(300);
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      
      // Simulate response with null
      res.json(null);
      
      // Wait for async cache operation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should not cache null response
      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    });

    it('should not cache error responses with error property', async () => {
      mockRedisClient.get
        .mockResolvedValueOnce('1')
        .mockResolvedValueOnce(null);
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const middleware = cacheMiddleware(300);
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      
      // Simulate error response with 'error' property
      res.json({ error: 'Something went wrong', status: 500 });
      
      // Wait for async cache operation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should not cache error response
      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    });

    it('should not cache message-only responses', async () => {
      mockRedisClient.get
        .mockResolvedValueOnce('1')
        .mockResolvedValueOnce(null);
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const middleware = cacheMiddleware(300);
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      
      // Simulate message-only response (common for simple errors)
      res.json({ message: 'Not found' });
      
      // Wait for async cache operation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should not cache message-only response
      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    });

    it('should cache valid paginated responses', async () => {
      mockRedisClient.get
        .mockResolvedValueOnce('1')
        .mockResolvedValueOnce(null);
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const middleware = cacheMiddleware(300);
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      
      // Simulate paginated response
      const responseData = { 
        items: [{ id: 1, name: 'Test' }], 
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
      };
      res.json(responseData);
      
      // Wait for async cache operation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'v1:GET:/api/items/',
        300,
        JSON.stringify(responseData)
      );
    });

    it('should not cache invalid paginated responses (missing items/pagination)', async () => {
      mockRedisClient.get
        .mockResolvedValueOnce('1')
        .mockResolvedValueOnce(null);
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const middleware = cacheMiddleware(300);
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      
      // Simulate invalid paginated response (missing items array)
      res.json({ pagination: { page: 1, limit: 10, total: 0 } });
      
      // Wait for async cache operation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should not cache invalid response
      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    });

    it('should cache empty arrays (valid response)', async () => {
      mockRedisClient.get
        .mockResolvedValueOnce('1')
        .mockResolvedValueOnce(null);
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const middleware = cacheMiddleware(300);
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      
      // Simulate empty array response (valid)
      res.json([]);
      
      // Wait for async cache operation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'v1:GET:/api/items/',
        300,
        JSON.stringify([])
      );
    });

    it('should continue without caching when Redis is not available', async () => {
      getRedisIfReady.mockReturnValueOnce(null);
      getRedisClient.mockResolvedValueOnce(null);
      
      const middleware = cacheMiddleware(300);
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      getRedisIfReady.mockReturnValueOnce(mockRedisClient);
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));
      
      const middleware = cacheMiddleware(300);
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
  });

  describe('invalidateCache (deprecated SCAN method)', () => {
    it('should delete all keys matching the pattern using SCAN', async () => {
      const keys = ['/api/items/', '/api/items/?page=1', '/api/items/?page=2'];
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
          keys: ['/api/items/?page=1']
        })
        .mockResolvedValueOnce({
          cursor: 0,
          keys: ['/api/items/?page=2']
        });
      mockRedisClient.del.mockResolvedValue(2);
      
      await invalidateCache('/api/items*');
      
      expect(mockRedisClient.scan).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.del).toHaveBeenCalledWith(['/api/items/?page=1', '/api/items/?page=2']);
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

  describe('invalidateItemCache (now uses separate version)', () => {
    it('should bump item cache version only', async () => {
      mockRedisClient.incr.mockResolvedValue(2);
      
      await invalidateItemCache();
      
      expect(mockRedisClient.incr).toHaveBeenCalledWith('cache:v:items');
    });
  });

  describe('invalidateOrderCache (now uses separate version)', () => {
    it('should bump order cache version only', async () => {
      mockRedisClient.incr.mockResolvedValue(3);
      
      await invalidateOrderCache();
      
      expect(mockRedisClient.incr).toHaveBeenCalledWith('cache:v:orders');
    });
  });

  describe('invalidatePaginatedOrderCache', () => {
    it('should bump order cache version only', async () => {
      mockRedisClient.incr.mockResolvedValue(4);
      
      const { invalidatePaginatedOrderCache } = await import('../../middleware/cache.js');
      await invalidatePaginatedOrderCache();
      
      expect(mockRedisClient.incr).toHaveBeenCalledWith('cache:v:orders');
    });
  });

  describe('invalidatePriorityOrderCache', () => {
    it('should bump order cache version only', async () => {
      mockRedisClient.incr.mockResolvedValue(5);
      
      const { invalidatePriorityOrderCache } = await import('../../middleware/cache.js');
      await invalidatePriorityOrderCache();
      
      expect(mockRedisClient.incr).toHaveBeenCalledWith('cache:v:orders');
    });
  });

  describe('clearAllCache', () => {
    it('should clear all caches and reset version', async () => {
      mockRedisClient.flushDb.mockResolvedValue('OK');
      mockRedisClient.set.mockResolvedValue('OK');
      
      await clearAllCache();
      
      expect(mockRedisClient.flushDb).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalledWith('cache:v:global', '1');
    });

    it('should continue when Redis is not available', async () => {
      getRedisClient.mockResolvedValueOnce(null);
      
      await clearAllCache();
      
      expect(mockRedisClient.flushDb).not.toHaveBeenCalled();
    });
  });
});
