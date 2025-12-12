import { getRedisClient } from '../db/redisClient.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('CacheMiddleware');

// Default cache TTL (Time To Live) in seconds
const DEFAULT_TTL = 300; // 5 minutes

/**
 * Validate response data before caching to prevent caching invalid/empty data
 * @param {*} body - Response body to validate
 * @returns {boolean} True if response should be cached
 */
function validateResponseForCaching(body) {
  // Don't cache null or undefined responses
  if (body === null || body === undefined) {
    return false;
  }
  
  // Don't cache error responses
  // Check if response has 'error' or 'message' properties that indicate an error
  if (typeof body === 'object' && !Array.isArray(body)) {
    // If response has 'error' key, it's likely an error response - don't cache
    if ('error' in body) {
      return false;
    }
    // If response only has 'message' key (common for simple errors), don't cache
    // Note: Valid responses with 'message' + other properties will still be cached
    const keys = Object.keys(body);
    if (keys.length === 1 && keys[0] === 'message') {
      return false;
    }
  }
  
  // For paginated responses, validate structure
  if (body && typeof body === 'object' && 'pagination' in body) {
    // Ensure items/orders array exists and pagination metadata is present
    const dataKey = body.items !== undefined ? 'items' : body.orders !== undefined ? 'orders' : null;
    if (!dataKey || !Array.isArray(body[dataKey]) || !body.pagination) {
      return false;
    }
  }
  
  // For array responses, ensure it's a valid array
  if (Array.isArray(body)) {
    return true; // Cache empty arrays too, as they're valid responses
  }
  
  // Cache all other valid object responses
  return typeof body === 'object';
}

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
        // Validate response before caching to prevent caching invalid/empty data
        const shouldCache = validateResponseForCaching(body);
        
        if (shouldCache) {
          // Cache the response asynchronously (don't wait)
          redis.setEx(cacheKey, ttl, JSON.stringify(body))
            .then(() => {
              logger.debug('Response cached', { key: cacheKey, ttl });
            })
            .catch(err => {
              logger.error('Failed to cache response', { key: cacheKey, error: err.message });
            });
        } else {
          logger.debug('Response not cached due to validation failure', { key: cacheKey });
        }
        
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
 * Invalidate cache for a specific pattern using SCAN for better performance
 * @param {string} pattern - Cache key pattern (supports wildcards with *)
 */
export async function invalidateCache(pattern) {
  try {
    const redis = await getRedisClient();
    
    if (!redis) {
      logger.debug('Redis not available, skipping cache invalidation');
      return;
    }

    // Use SCAN instead of KEYS for better performance in production
    const keys = [];
    let cursor = 0;
    
    do {
      const result = await redis.scan(cursor, {
        MATCH: pattern,
        COUNT: 100
      });
      
      cursor = result.cursor;
      keys.push(...result.keys);
    } while (cursor !== 0);
    
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
  await invalidateCache('/api/items*');
}

/**
 * Invalidate all order-related caches
 * Clears both paginated orders and priority orders caches
 */
export async function invalidateOrderCache() {
  // Invalidate all order-related endpoints
  await invalidateCache('/api/orders*');
}

/**
 * Invalidate only paginated order history caches
 */
export async function invalidatePaginatedOrderCache() {
  await invalidateCache('/api/orders?*');
}

/**
 * Invalidate only priority orders cache
 */
export async function invalidatePriorityOrderCache() {
  await invalidateCache('/api/orders/priority*');
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
