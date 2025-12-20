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
 * Supports stale-while-revalidate pattern for better performance
 * 
 * @param handler - The original route handler function
 * @param ttl - Time to live in seconds (default: 300)
 * @param options - Additional caching options
 * @param options.staleWhileRevalidate - Time in seconds to serve stale data while revalidating (default: 0)
 * @returns Wrapped handler with caching
 * 
 * @example
 * // Basic caching (5 minutes fresh)
 * export const GET = withCache(handler, 300);
 * 
 * @example
 * // Stale-while-revalidate (5 minutes fresh, serve stale for 10 minutes while revalidating)
 * export const GET = withCache(handler, 300, { staleWhileRevalidate: 600 });
 */
export function withCache(
  handler: (request: NextRequest) => Promise<NextResponse>,
  ttl: number = DEFAULT_TTL,
  options: { staleWhileRevalidate?: number } = {}
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
      const staleKey = `${cacheKey}:stale`;
      
      // Try to get cached data
      const cachedData = await redis.get(cacheKey);
      
      if (cachedData) {
        logger.debug('Cache hit', { key: cacheKey, version });
        return NextResponse.json(JSON.parse(cachedData), {
          headers: {
            'X-Cache': 'HIT',
            'Cache-Control': options.staleWhileRevalidate 
              ? `public, max-age=${ttl}, stale-while-revalidate=${options.staleWhileRevalidate}`
              : `public, max-age=${ttl}`,
          },
        });
      }

      // Check for stale data if stale-while-revalidate is enabled
      if (options.staleWhileRevalidate) {
        const staleData = await redis.get(staleKey);
        
        if (staleData) {
          logger.debug('Serving stale data while revalidating', { key: cacheKey, version });
          
          // Revalidate in background (don't await)
          revalidateInBackground(handler, request, redis, cacheKey, staleKey, ttl, options.staleWhileRevalidate);
          
          return NextResponse.json(JSON.parse(staleData), {
            headers: {
              'X-Cache': 'STALE',
              'Cache-Control': `public, max-age=0, stale-while-revalidate=${options.staleWhileRevalidate}`,
            },
          });
        }
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
            const dataStr = JSON.stringify(data);
            
            // Cache the fresh data
            await Promise.all([
              redis.setEx(cacheKey, ttl, dataStr),
              // If stale-while-revalidate is enabled, also store in stale key with longer TTL
              options.staleWhileRevalidate 
                ? redis.setEx(staleKey, ttl + options.staleWhileRevalidate, dataStr)
                : Promise.resolve()
            ]);
            
            logger.debug('Response cached', { key: cacheKey, ttl, hasStale: !!options.staleWhileRevalidate });
          } else {
            logger.debug('Response not cached due to validation failure', { key: cacheKey });
          }
        } catch (err: any) {
          logger.error('Failed to parse response for caching', { error: err.message });
        }
      }
      
      // Add cache status header and Cache-Control
      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'X-Cache': 'MISS',
          'Cache-Control': options.staleWhileRevalidate 
            ? `public, max-age=${ttl}, stale-while-revalidate=${options.staleWhileRevalidate}`
            : `public, max-age=${ttl}`,
        },
      });
    } catch (error: any) {
      logger.error('Cache wrapper error', error);
      // Continue without caching on error
      return handler(request);
    }
  };
}

/**
 * Revalidate cache in background while serving stale data
 */
async function revalidateInBackground(
  handler: (request: NextRequest) => Promise<NextResponse>,
  request: NextRequest,
  redis: any,
  cacheKey: string,
  staleKey: string,
  ttl: number,
  staleWhileRevalidate: number
): Promise<void> {
  try {
    // Execute the handler to get fresh data
    const response = await handler(request);
    
    // Only cache successful JSON responses
    if (response.status === 200 && response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json();
      
      // Validate response before caching
      if (validateResponseForCaching(data)) {
        const dataStr = JSON.stringify(data);
        
        // Update both fresh and stale caches
        await Promise.all([
          redis.setEx(cacheKey, ttl, dataStr),
          redis.setEx(staleKey, ttl + staleWhileRevalidate, dataStr)
        ]);
        
        logger.debug('Background revalidation completed', { key: cacheKey });
      }
    }
  } catch (err: any) {
    logger.error('Background revalidation failed', { key: cacheKey, error: err.message });
  }
}
