import { getRedisClient } from '../db/redisClient.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('CacheMiddleware');

// Default cache TTL (Time To Live) in seconds
const DEFAULT_TTL = 300; // 5 minutes

/**
 * Generate a cache key from request path and query parameters
 * @param {Object} req - Express request object
 * @returns {string} Cache key
 */
export function generateCacheKey(req) {
  const path = req.path;
  const queryString = Object.keys(req.query)
    .sort()
    .map(key => `${key}=${req.query[key]}`)
    .join('&');
  
  return queryString ? `${path}?${queryString}` : path;
}

/**
 * Cache middleware for GET requests
 * @param {number} ttl - Time to live in seconds (default: 300)
 * @returns {Function} Express middleware
 */
export function cacheMiddleware(ttl = DEFAULT_TTL) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      const redis = await getRedisClient();
      
      // Skip caching if Redis is not available
      if (!redis) {
        return next();
      }

      const cacheKey = generateCacheKey(req);
      
      // Try to get cached data
      const cachedData = await redis.get(cacheKey);
      
      if (cachedData) {
        logger.debug('Cache hit', { key: cacheKey });
        // Parse and return cached data
        return res.json(JSON.parse(cachedData));
      }

      logger.debug('Cache miss', { key: cacheKey });
      
      // Store original res.json to intercept the response
      const originalJson = res.json.bind(res);
      
      // Override res.json to cache the response
      res.json = function(body) {
        // Cache the response asynchronously (don't wait)
        redis.setEx(cacheKey, ttl, JSON.stringify(body))
          .then(() => {
            logger.debug('Response cached', { key: cacheKey, ttl });
          })
          .catch(err => {
            logger.error('Failed to cache response', { key: cacheKey, error: err.message });
          });
        
        // Call original res.json
        return originalJson(body);
      };
      
      next();
    } catch (error) {
      logger.error('Cache middleware error', error);
      // Continue without caching on error
      next();
    }
  };
}

/**
 * Invalidate cache for a specific pattern
 * @param {string} pattern - Cache key pattern (supports wildcards with *)
 */
export async function invalidateCache(pattern) {
  try {
    const redis = await getRedisClient();
    
    if (!redis) {
      logger.debug('Redis not available, skipping cache invalidation');
      return;
    }

    // Find all keys matching the pattern
    const keys = await redis.keys(pattern);
    
    if (keys.length === 0) {
      logger.debug('No cache keys found for pattern', { pattern });
      return;
    }

    // Delete all matching keys
    await redis.del(keys);
    logger.info('Cache invalidated', { pattern, keysDeleted: keys.length });
  } catch (error) {
    logger.error('Failed to invalidate cache', { pattern, error: error.message });
  }
}

/**
 * Invalidate all item-related caches
 */
export async function invalidateItemCache() {
  await Promise.all([
    invalidateCache('/api/items*'),
    invalidateCache('/api/items/*')
  ]);
}

/**
 * Invalidate all order-related caches
 */
export async function invalidateOrderCache() {
  await Promise.all([
    invalidateCache('/api/orders*'),
    invalidateCache('/api/orders/*')
  ]);
}

/**
 * Clear all caches
 */
export async function clearAllCache() {
  try {
    const redis = await getRedisClient();
    
    if (!redis) {
      logger.debug('Redis not available, skipping cache clear');
      return;
    }

    await redis.flushDb();
    logger.info('All caches cleared');
  } catch (error) {
    logger.error('Failed to clear all caches', error);
  }
}
