import { getRedisClient, getRedisIfReady } from '../db/redisClient.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('CacheMiddleware');

// Default cache TTL (Time To Live) in seconds
const DEFAULT_TTL = 300; // 5 minutes

// Global cache version key - used for versioned cache invalidation
export const CACHE_VERSION_KEY = 'cache:v:global';

// In-memory memoization for version lookup to reduce Redis calls in burst traffic
let localVersion = null;
let localVersionFetchedAt = 0;
const VERSION_MEMO_TTL_MS = 3000; // 3 seconds memoization

// In-memory locks for preventing cache stampede
// Maps cache key to a list of pending resolvers
const pendingRequests = new Map();

// Lock timeout to prevent deadlocks (in milliseconds)
const LOCK_TIMEOUT = 30000; // 30 seconds

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
    // Ensure items/orders/feedbacks array exists and pagination metadata is present
    const dataKey = body.items !== undefined ? 'items' : body.orders !== undefined ? 'orders' : body.feedbacks !== undefined ? 'feedbacks' : null;
    if (!dataKey || !Array.isArray(body[dataKey]) || !body.pagination) {
      logger.debug('Paginated response validation failed', { 
        hasDataKey: !!dataKey,
        dataKey,
        isArray: body[dataKey] ? Array.isArray(body[dataKey]) : false,
        hasPagination: !!body.pagination 
      });
      return false;
    }
    logger.debug('Paginated response validated successfully', { dataKey, itemCount: body[dataKey].length });
  }
  
  // For array responses, ensure it's a valid array
  if (Array.isArray(body)) {
    return true; // Cache empty arrays too, as they're valid responses
  }
  
  // Cache all other valid object responses
  return typeof body === 'object';
}

/**
 * Get the current global cache version from Redis with in-memory memoization
 * This reduces Redis lookups in burst traffic on warm lambdas
 * @param {Object} redis - Redis client
 * @returns {Promise<number>} Current version number (defaults to 1 if not set)
 */
async function getGlobalCacheVersion(redis) {
  const now = Date.now();
  
  // Return memoized version if still valid
  if (localVersion !== null && (now - localVersionFetchedAt) < VERSION_MEMO_TTL_MS) {
    logger.debug('Using memoized cache version', { version: localVersion });
    return localVersion;
  }
  
  try {
    let version = await redis.get(CACHE_VERSION_KEY);
    
    if (version === null) {
      // Initialize version to 1 if it doesn't exist (use SETNX for atomicity)
      await redis.setNX(CACHE_VERSION_KEY, '1');
      version = '1';
      logger.debug('Initialized global cache version', { version: 1 });
    }
    
    const parsedVersion = parseInt(version, 10);
    
    // Update memoization
    localVersion = parsedVersion;
    localVersionFetchedAt = now;
    
    logger.debug('Fetched global cache version from Redis', { version: parsedVersion });
    return parsedVersion;
  } catch (error) {
    logger.error('Failed to get global cache version', { error: error.message });
    // Return memoized version or default to 1 on error
    return localVersion !== null ? localVersion : 1;
  }
}

/**
 * Bump (increment) the global cache version to invalidate all cached entries
 * This is more efficient than SCAN-based invalidation for serverless environments
 * @returns {Promise<number|null>} New version number, or null if Redis unavailable
 */
export async function bumpGlobalCacheVersion() {
  try {
    const redis = getRedisIfReady();
    
    if (!redis) {
      logger.debug('Redis not ready, skipping cache version bump');
      return null;
    }
    
    const newVersion = await redis.incr(CACHE_VERSION_KEY);
    
    // Update local memoization eagerly
    localVersion = newVersion;
    localVersionFetchedAt = Date.now();
    
    logger.info('Global cache version bumped', { newVersion });
    return newVersion;
  } catch (error) {
    logger.error('Failed to bump global cache version', { error: error.message });
    return null;
  }
}

/**
 * Reset the in-memory version cache and pending requests (useful for testing)
 */
export function resetVersionMemo() {
  localVersion = null;
  localVersionFetchedAt = 0;
  pendingRequests.clear();
}

/**
 * Generate a versioned cache key from request path, method, and query parameters
 * Format: v{VERSION}:{METHOD}:{FULL_PATH}?{SORTED_QUERY}
 * @param {Object} req - Express request object
 * @param {number} version - Cache version number
 * @returns {string} Versioned cache key
 */
export function generateCacheKey(req, version = null) {
  // Use baseUrl + path to get the full path including mounted router base
  // baseUrl contains the mount point (e.g., '/api/items')
  // path contains the route path relative to the router (e.g., '/', '/:id')
  const fullPath = req.baseUrl + req.path;
  const method = req.method || 'GET';
  const queryString = Object.keys(req.query)
    .sort()
    .map(key => `${key}=${req.query[key]}`)
    .join('&');
  
  const pathWithQuery = queryString ? `${fullPath}?${queryString}` : fullPath;
  
  // If version is provided, include it in the key
  if (version !== null) {
    return `v${version}:${method}:${pathWithQuery}`;
  }
  
  // For backward compatibility, return path-only key if no version provided
  return pathWithQuery;
}

/**
 * Wait for a pending cache request to complete
 * Returns the cached data if available, null if timeout or error
 */
async function waitForPendingRequest(cacheKey, redis) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      logger.debug('Lock wait timeout', { key: cacheKey });
      resolve(null);
    }, LOCK_TIMEOUT);
    
    if (!pendingRequests.has(cacheKey)) {
      clearTimeout(timeout);
      resolve(null);
      return;
    }
    
    pendingRequests.get(cacheKey).push((data) => {
      clearTimeout(timeout);
      resolve(data);
    });
  });
}

/**
 * Notify all waiting requests that cache has been populated
 */
function notifyPendingRequests(cacheKey, data) {
  const waiters = pendingRequests.get(cacheKey);
  if (waiters) {
    pendingRequests.delete(cacheKey);
    waiters.forEach(resolve => resolve(data));
  }
}

/**
 * Cache middleware for GET requests with stampede protection
 * Uses request coalescing to prevent multiple identical requests from hitting the database
 * Now uses global versioned cache keys for efficient invalidation
 * @param {number} ttl - Time to live in seconds (default: 300)
 * @returns {Function} Express middleware
 */
export function cacheMiddleware(ttl = DEFAULT_TTL) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Declare cacheKey outside try block for cleanup in catch
    let cacheKey = null;

    try {
      // Prefer ready client for serverless optimization
      let redis = getRedisIfReady();
      
      // If not ready, try to get client (this may involve connection)
      if (!redis) {
        redis = await getRedisClient();
      }
      
      // Skip caching if Redis is not available
      if (!redis) {
        logger.debug('Redis not available, skipping cache');
        return next();
      }

      // Get the current global cache version
      const version = await getGlobalCacheVersion(redis);
      
      // Generate versioned cache key: v{VERSION}:{METHOD}:{PATH}
      cacheKey = generateCacheKey(req, version);
      
      // Try to get cached data
      const cachedData = await redis.get(cacheKey);
      
      if (cachedData) {
        logger.debug('Cache hit', { key: cacheKey, version });
        // Parse and return cached data
        return res.json(JSON.parse(cachedData));
      }

      logger.debug('Cache miss', { key: cacheKey, version });
      
      // Check if there's already a pending request for this key (stampede protection)
      if (pendingRequests.has(cacheKey)) {
        logger.debug('Request coalescing - waiting for pending request', { key: cacheKey });
        const coalescedData = await waitForPendingRequest(cacheKey, redis);
        if (coalescedData) {
          logger.debug('Returning coalesced data', { key: cacheKey });
          return res.json(coalescedData);
        }
        // If wait failed, try cache again or fall through to fetch
        const retryData = await redis.get(cacheKey);
        if (retryData) {
          return res.json(JSON.parse(retryData));
        }
      }
      
      // Register this request as the one that will populate the cache
      pendingRequests.set(cacheKey, []);
      
      // Store original res.json to intercept the response
      const originalJson = res.json.bind(res);
      
      // Track if response was sent to cleanup pending requests
      let responseSent = false;
      let cleanedUp = false;
      
      // Cleanup function to ensure pending requests are notified (only once)
      const cleanupPendingRequest = () => {
        if (!cleanedUp && !responseSent && pendingRequests.has(cacheKey)) {
          cleanedUp = true;
          notifyPendingRequests(cacheKey, null);
        }
      };
      
      // Listen for response finish to cleanup if response was sent without res.json
      res.on('finish', cleanupPendingRequest);
      res.on('close', cleanupPendingRequest);
      
      // Override res.json to cache the response
      res.json = function(body) {
        responseSent = true;
        
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
          
          // Notify waiting requests with the cached data
          notifyPendingRequests(cacheKey, body);
        } else {
          logger.debug('Response not cached due to validation failure', { key: cacheKey });
          // Still notify pending requests to unblock them (they'll re-fetch)
          notifyPendingRequests(cacheKey, null);
        }
        
        // Call original res.json
        return originalJson(body);
      };
      
      next();
    } catch (error) {
      logger.error('Cache middleware error', error);
      // Cleanup pending requests on error
      if (pendingRequests.has(cacheKey)) {
        notifyPendingRequests(cacheKey, null);
      }
      // Continue without caching on error
      next();
    }
  };
}

/**
 * Invalidate cache for a specific pattern using SCAN for better performance
 * @deprecated Prefer using bumpGlobalCacheVersion() for invalidation in serverless environments
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
    logger.info('Cache invalidated (SCAN)', { pattern, keysDeleted: keys.length });
  } catch (error) {
    logger.error('Failed to invalidate cache', { pattern, error: error.message });
  }
}

/**
 * Invalidate all item-related caches by bumping global version
 * This is preferred over SCAN-based invalidation for serverless environments
 */
export async function invalidateItemCache() {
  logger.debug('Invalidating item cache via version bump');
  await bumpGlobalCacheVersion();
}

/**
 * Invalidate all order-related caches by bumping global version
 * This is preferred over SCAN-based invalidation for serverless environments
 */
export async function invalidateOrderCache() {
  logger.debug('Invalidating order cache via version bump');
  await bumpGlobalCacheVersion();
}

/**
 * Invalidate all feedback-related caches by bumping global version
 */
export async function invalidateFeedbackCache() {
  logger.debug('Invalidating feedback cache via version bump');
  await bumpGlobalCacheVersion();
}

/**
 * Invalidate only paginated order history caches by bumping global version
 * Note: With global versioning, this invalidates all caches, not just paginated orders
 */
export async function invalidatePaginatedOrderCache() {
  logger.debug('Invalidating paginated order cache via version bump');
  await bumpGlobalCacheVersion();
}

/**
 * Invalidate only priority orders cache by bumping global version
 * Note: With global versioning, this invalidates all caches, not just priority orders
 */
export async function invalidatePriorityOrderCache() {
  logger.debug('Invalidating priority order cache via version bump');
  await bumpGlobalCacheVersion();
}

/**
 * Clear all caches (debug utility)
 * This flushes all Redis data - use with caution in production
 * For normal cache invalidation, prefer bumpGlobalCacheVersion()
 */
export async function clearAllCache() {
  try {
    const redis = await getRedisClient();
    
    if (!redis) {
      logger.debug('Redis not available, skipping cache clear');
      return;
    }

    await redis.flushDb();
    
    // Reset the version after flushing
    await redis.set(CACHE_VERSION_KEY, '1');
    localVersion = 1;
    localVersionFetchedAt = Date.now();
    
    logger.info('All caches cleared and version reset');
  } catch (error) {
    logger.error('Failed to clear all caches', error);
  }
}
