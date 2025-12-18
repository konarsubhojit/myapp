// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient, getRedisIfReady } from '@/lib/db/redisClient';
import { createLogger } from '@/lib/utils/logger';
import { getCacheVersion, CACHE_VERSION_KEYS } from '@/lib/middleware/cache';

const logger = createLogger('NextCacheMiddleware');

// Default cache TTL (Time To Live) in seconds
const DEFAULT_TTL = 300; // 5 minutes

// Map URL patterns to cache version keys
const CACHE_VERSION_MAP: Record<string, string> = {
  '/api/items': CACHE_VERSION_KEYS.ITEMS,
  '/api/orders': CACHE_VERSION_KEYS.ORDERS,
  '/api/feedbacks': CACHE_VERSION_KEYS.FEEDBACKS,
};

/**
 * Determine which cache version key to use based on the request URL
 */
function getCacheVersionKeyForUrl(pathname: string): string {
  for (const [pattern, versionKey] of Object.entries(CACHE_VERSION_MAP)) {
    if (pathname.startsWith(pattern)) {
      return versionKey;
    }
  }
  return CACHE_VERSION_KEYS.GLOBAL;
}

/**
 * Generate a versioned cache key from request path and query parameters
 */
function generateCacheKey(request: NextRequest, version: number): string {
  const { pathname, search } = new URL(request.url);
  const method = request.method || 'GET';
  
  // Include search params in cache key
  const pathWithQuery = search ? `${pathname}${search}` : pathname;
  
  return `v${version}:${method}:${pathWithQuery}`;
}

/**
 * Check if response is an error response
 */
function isErrorResponse(data: any): boolean {
  if (typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }
  
  // If response has 'error' key, it's likely an error response
  if ('error' in data) {
    return true;
  }
  
  // If response only has 'message' key (common for simple errors)
  const keys = Object.keys(data);
  return keys.length === 1 && keys[0] === 'message';
}

/**
 * Validate response data before caching
 */
function validateResponseForCaching(data: any): boolean {
  // Don't cache null or undefined responses
  if (data === null || data === undefined) {
    return false;
  }
  
  // Don't cache error responses
  if (isErrorResponse(data)) {
    return false;
  }
  
  // Cache all other valid responses (including empty arrays/objects)
  return true;
}

/**
 * Cache wrapper for Next.js API route handlers with Redis
 * Only caches GET requests
 * 
 * @param handler - The original route handler function
 * @param ttl - Time to live in seconds (default: 300)
 * @returns Wrapped handler with caching
 * 
 * @example
 * export const GET = withCache(async (request: NextRequest) => {
 *   const data = await fetchData();
 *   return NextResponse.json(data);
 * }, 600); // Cache for 10 minutes
 */
export function withCache(
  handler: (request: NextRequest) => Promise<NextResponse>,
  ttl: number = DEFAULT_TTL
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Only cache GET requests
    if (request.method !== 'GET') {
      return handler(request);
    }

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
        return handler(request);
      }

      // Determine which cache version key to use
      const { pathname } = new URL(request.url);
      const versionKey = getCacheVersionKeyForUrl(pathname);
      
      // Get the current cache version for this resource type
      const version = await getCacheVersion(redis, versionKey);
      
      // Generate versioned cache key
      const cacheKey = generateCacheKey(request, version);
      
      // Try to get cached data
      const cachedData = await redis.get(cacheKey);
      
      if (cachedData) {
        logger.debug('Cache hit', { key: cacheKey, version });
        return NextResponse.json(JSON.parse(cachedData), {
          headers: {
            'X-Cache': 'HIT',
          },
        });
      }

      logger.debug('Cache miss', { key: cacheKey, version });
      
      // Execute the handler to get fresh data
      const response = await handler(request);
      
      // Only cache successful JSON responses
      if (response.status === 200 && response.headers.get('content-type')?.includes('application/json')) {
        try {
          // Clone response to read the body
          const clonedResponse = response.clone();
          const data = await clonedResponse.json();
          
          // Validate response before caching
          if (validateResponseForCaching(data)) {
            // Cache the response asynchronously (don't wait)
            redis.setEx(cacheKey, ttl, JSON.stringify(data))
              .then(() => {
                logger.debug('Response cached', { key: cacheKey, ttl });
              })
              .catch((err: any) => {
                logger.error('Failed to cache response', { key: cacheKey, error: err.message });
              });
          } else {
            logger.debug('Response not cached due to validation failure', { key: cacheKey });
          }
        } catch (err: any) {
          logger.error('Failed to parse response for caching', { error: err.message });
        }
      }
      
      // Add cache status header
      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'X-Cache': 'MISS',
        },
      });
    } catch (error: any) {
      logger.error('Cache wrapper error', error);
      // Continue without caching on error
      return handler(request);
    }
  };
}
