import { QueryClient } from '@tanstack/react-query';

/**
 * Singleton QueryClient instance for the application
 * Centralized configuration ensures consistent caching behavior
 * Optimized for performance with stale-while-revalidate strategy
 * 
 * Performance Trade-offs:
 * - refetchOnWindowFocus: Disabled to reduce API calls, but users may see stale data
 *   when returning to the app. For critical data (order status, inventory), consider
 *   enabling per-query overrides or reducing staleTime.
 * - refetchOnMount: Disabled in favor of staleTime. Components remounting won't
 *   trigger refetches within the 5-minute stale window.
 * - staleTime: 5 minutes. Data is considered fresh for this duration. Increase for
 *   less critical data, decrease for real-time requirements.
 * 
 * Per-Query Overrides:
 * For critical queries that need fresh data, override these defaults:
 * ```typescript
 * useQuery({
 *   queryKey: ['critical-data'],
 *   queryFn: fetchCriticalData,
 *   staleTime: 30_000, // 30 seconds for more frequent updates
 *   refetchOnWindowFocus: true, // Enable for critical data
 * });
 * ```
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000, // 5 minutes fresh (increased from 2 minutes)
      gcTime: 15 * 60_000, // Keep in cache for 15 minutes
      retry: 1,
      refetchOnWindowFocus: false, // Disabled for better performance (see trade-offs above)
      refetchOnReconnect: true,
      refetchOnMount: false, // Disabled - use staleTime instead (see trade-offs above)
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * Clear all query cache
 * Useful when switching between guest mode and authenticated mode
 */
export function clearQueryCache(): void {
  queryClient.clear();
}

/**
 * Remove all queries from cache without cancelling ongoing fetches
 */
export function removeAllQueries(): void {
  queryClient.removeQueries();
}
