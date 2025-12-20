import { QueryClient } from '@tanstack/react-query';

/**
 * Singleton QueryClient instance for the application
 * Centralized configuration ensures consistent caching behavior
 * Optimized for performance with stale-while-revalidate strategy
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000, // 5 minutes fresh (increased from 2 minutes)
      gcTime: 15 * 60_000, // Keep in cache for 15 minutes
      retry: 1,
      refetchOnWindowFocus: false, // Disabled for better performance
      refetchOnReconnect: true,
      refetchOnMount: false, // Disabled - use staleTime instead
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
