import { QueryClient } from '@tanstack/react-query';

/**
 * Singleton QueryClient instance for the application
 * Centralized configuration ensures consistent caching behavior
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60_000, // 2 minutes fresh
      gcTime: 15 * 60_000, // Keep in cache for 15 minutes
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
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
