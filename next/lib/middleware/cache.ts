// @ts-nocheck
import { getRedisClient, getRedisIfReady } from '@/lib/db/redisClient';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('CacheMiddleware');

// Default cache TTL (Time To Live) in seconds
const DEFAULT_TTL = 300; // 5 minutes

// Cache version keys - separate versioning for different resource types
export const CACHE_VERSION_KEYS = {
  ITEMS: 'cache:v:items',
  ORDERS: 'cache:v:orders',
  FEEDBACKS: 'cache:v:feedbacks',
  GLOBAL: 'cache:v:global', // Fallback for non-resource-specific caches
};

// Map URL patterns to cache version keys
const CACHE_VERSION_MAP = {
  '/api/items': CACHE_VERSION_KEYS.ITEMS,
  '/api/orders': CACHE_VERSION_KEYS.ORDERS,
  '/api/feedbacks': CACHE_VERSION_KEYS.FEEDBACKS,
};

// Legacy export for backward compatibility
export const CACHE_VERSION_KEY = CACHE_VERSION_KEYS.GLOBAL;

// In-memory memoization for version lookup to reduce Redis calls in burst traffic
// Note: Node.js is single-threaded, so concurrent requests are handled sequentially
// in the event loop, making this safe for per-instance caching in serverless.
//
// IMPORTANT: In multi-instance serverless deployments (e.g., Vercel), each instance has its
// own in-memory version cache. During the memoization window, different instances may use
// different cache versions. This can result in stale data being served after cache invalidation.
// This is a deliberate performance vs. consistency trade-off to reduce Redis GET calls.
// Reduce VERSION_MEMO_TTL_MS for stronger consistency or set to 0 to disable memoization.
const localVersions = new Map(); // Map<versionKey, { version: number, fetchedAt: number }>
// Memoization TTL for cache version (in ms). Reduce this to minimize stale data risk.
// Trade-off: Lower values increase Redis load but improve consistency.
export const VERSION_MEMO_TTL_MS = 200; // 200ms memoization (minimizes staleness window)

// In-memory locks for preventing cache stampede
// Maps cache key to a list of pending resolvers
const pendingRequests = new Map();

// Lock timeout to prevent deadlocks (in milliseconds)
const LOCK_TIMEOUT = 30000; // 30 seconds

/**
 * Check if response is an error response
 * @param {*} body - Response body to check
 * @returns {boolean} True if response is an error
 */
function isErrorResponse(body) {
  if (typeof body !== 'object' || Array.isArray(body)) {
    return false;
  }
  
  // If response has 'error' key, it's likely an error response
  if ('error' in body) {
    return true;
  }
  
  // If response only has 'message' key (common for simple errors)
  // Note: Valid responses with 'message' + other properties will still be cached
  const keys = Object.keys(body);
  return keys.length === 1 && keys[0] === 'message';
}

/**
 * Validate paginated response structure
 * @param {Object} body - Response body to validate
 * @returns {boolean} True if paginated response is valid
 */
function validatePaginatedResponse(body) {
  // Ensure items/orders/feedbacks array exists and pagination metadata is present
  const dataKey = body.items !== undefined ? 'items' : 
                  body.orders !== undefined ? 'orders' : 
                  body.feedbacks !== undefined ? 'feedbacks' : null;
  
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
  return true;
}

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
  if (isErrorResponse(body)) {
    return false;
  }
  
  // For paginated responses, validate structure
  if (body && typeof body === 'object' && 'pagination' in body) {
    return validatePaginatedResponse(body);
  }
  
  // For array responses, ensure it's a valid array
  if (Array.isArray(body)) {
    return true; // Cache empty arrays too, as they're valid responses
  }
  
  // Cache all other valid object responses
  return typeof body === 'object';
}

/**
 * Get the cache version from Redis with in-memory memoization
 * This reduces Redis lookups in burst traffic on warm lambdas
 * @param {Object} redis - Redis client
 * @param {string} versionKey - Cache version key (e.g., CACHE_VERSION_KEYS.ITEMS)
 * @returns {Promise<number>} Current version number (defaults to 1 if not set)
 * @exported for testing purposes
 */
export async function getCacheVersion(redis: any, versionKey: string = CACHE_VERSION_KEYS.GLOBAL) {
  const now = Date.now();
  
  // Return memoized version if still valid
  const cached = localVersions.get(versionKey);
  if (cached && (now - cached.fetchedAt) < VERSION_MEMO_TTL_MS) {
    logger.debug('Using memoized cache version', { versionKey, version: cached.version });
    return cached.version;
  }
  
  try {
    let version = await redis.get(versionKey);
    
    if (version === null) {
      // Initialize version to 1 if it doesn't exist (use SETNX for atomicity)
      const wasSet = await redis.setNX(versionKey, '1');
      if (wasSet) {
        version = '1';
        logger.debug('Initialized cache version', { versionKey, version: 1 });
      } else {
        // Another process set it first, fetch the actual value
        version = await redis.get(versionKey) || '1';
        logger.debug('Fetched existing cache version after race', { versionKey, version });
      }
    }
    
    const parsedVersion = Number.parseInt(version, 10);
    
    // Update memoization
    localVersions.set(versionKey, { version: parsedVersion, fetchedAt: now });
    
    logger.debug('Fetched cache version from Redis', { versionKey, version: parsedVersion });
    return parsedVersion;
  } catch (error: any) {
    logger.error('Failed to get cache version', { versionKey, error: error.message });
    // Return memoized version or default to 1 on error
    return cached ? cached.version : 1;
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getCacheVersion(redis, versionKey) instead
 */
export async function getGlobalCacheVersion(redis: any) {
  return getCacheVersion(redis, CACHE_VERSION_KEYS.GLOBAL);
}

/**
 * Bump (increment) a cache version to invalidate cached entries for that resource type
 * This is more efficient than SCAN-based invalidation for serverless environments
 * @param {string} versionKey - Cache version key to bump (e.g., CACHE_VERSION_KEYS.ITEMS)
 * @returns {Promise<number|null>} New version number, or null if Redis unavailable
 */
export async function bumpCacheVersion(versionKey: string = CACHE_VERSION_KEYS.GLOBAL) {
  try {
    const redis = getRedisIfReady();
    
    if (!redis) {
      logger.debug('Redis not ready, skipping cache version bump', { versionKey });
      return null;
    }
    
    const newVersion = await redis.incr(versionKey);
    
    // Update local memoization eagerly
    localVersions.set(versionKey, { version: newVersion, fetchedAt: Date.now() });
    
    logger.info('Cache version bumped', { versionKey, newVersion });
    return newVersion;
  } catch (error: any) {
    logger.error('Failed to bump cache version', { versionKey, error: error.message });
    return null;
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use bumpCacheVersion(versionKey) instead
 */
export async function bumpGlobalCacheVersion() {
  return bumpCacheVersion(CACHE_VERSION_KEYS.GLOBAL);
}

/**
 * Reset the in-memory version cache and pending requests (useful for testing)
 */
export function resetVersionMemo() {
  localVersions.clear();
  pendingRequests.clear();
}

/**
 * Determine which cache version key to use based on the request URL
 * @param {string} url - Request URL (baseUrl + path)
 * @returns {string} Cache version key to use
 */
function getCacheVersionKeyForUrl(url) {
  // Check if URL starts with any of the mapped patterns
  for (const [pattern, versionKey] of Object.entries(CACHE_VERSION_MAP)) {
    if (url.startsWith(pattern)) {
      return versionKey;
    }
  }
  
  // Default to global version key for unmapped URLs
  return CACHE_VERSION_KEYS.GLOBAL;
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
async function waitForPendingRequest(cacheKey: string, redis: any) {
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

      // Determine which cache version key to use based on the request URL
      const fullPath = req.baseUrl + req.path;
      const versionKey = getCacheVersionKeyForUrl(fullPath);
      
      // Get the current cache version for this resource type
      const version = await getCacheVersion(redis, versionKey);
      
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
    } catch (error: any) {
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
export async function invalidateCache(pattern: string) {
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
  } catch (error: any) {
    logger.error('Failed to invalidate cache', { pattern, error: error.message });
  }
}

/**
 * Invalidate all item-related caches by bumping item version
 * This only invalidates item caches, not orders or feedbacks
 */
export async function invalidateItemCache() {
  logger.debug('Invalidating item cache via version bump');
  await bumpCacheVersion(CACHE_VERSION_KEYS.ITEMS);
}

/**
 * Invalidate all order-related caches by bumping order version
 * This only invalidates order caches, not items or feedbacks
 */
export async function invalidateOrderCache() {
  logger.debug('Invalidating order cache via version bump');
  await bumpCacheVersion(CACHE_VERSION_KEYS.ORDERS);
}

/**
 * Invalidate all feedback-related caches by bumping feedback version
 * This only invalidates feedback caches, not items or orders
 */
export async function invalidateFeedbackCache() {
  logger.debug('Invalidating feedback cache via version bump');
  await bumpCacheVersion(CACHE_VERSION_KEYS.FEEDBACKS);
}

/**
 * Invalidate paginated order history caches by bumping order version
 * This only invalidates order caches, not all caches
 */
export async function invalidatePaginatedOrderCache() {
  logger.debug('Invalidating order cache via version bump (called from invalidatePaginatedOrderCache)');
  await bumpCacheVersion(CACHE_VERSION_KEYS.ORDERS);
}

/**
 * Invalidate priority orders cache by bumping order version
 * This only invalidates order caches, not all caches
 */
export async function invalidatePriorityOrderCache() {
  logger.debug('Invalidating order cache via version bump (called from invalidatePriorityOrderCache)');
  await bumpCacheVersion(CACHE_VERSION_KEYS.ORDERS);
}

/**
 * Clear all caches (debug utility)
 * This flushes all Redis data - use with caution in production
 * For normal cache invalidation, prefer bumpCacheVersion(versionKey)
 */
export async function clearAllCache() {
  try {
    const redis = await getRedisClient();
    
    if (!redis) {
      logger.debug('Redis not available, skipping cache clear');
      return;
    }

    await redis.flushDb();
    
    // Reset all version keys after flushing
    const versionKeys = Object.values(CACHE_VERSION_KEYS);
    for (const versionKey of versionKeys) {
      await redis.set(versionKey, '1');
      localVersions.set(versionKey, { version: 1, fetchedAt: Date.now() });
    }
    
    logger.info('All caches cleared and versions reset');
  } catch (error: any) {
    logger.error('Failed to clear all caches', error);
  }
}
