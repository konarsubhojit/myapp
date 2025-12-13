import { useQuery, type UseQueryResult, type UseQueryOptions } from '@tanstack/react-query';
import * as api from '../../services/api';
import { queryKeys } from '../../queryKeys';
import type { SalesAnalyticsResponse } from '../../types';

/**
 * Query hook for fetching sales analytics
 * Longer stale time since analytics data changes less frequently
 */
export function useSalesAnalyticsQuery(
  statusFilter: 'completed' | 'all' = 'completed',
  options?: Omit<UseQueryOptions<SalesAnalyticsResponse, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<SalesAnalyticsResponse, Error> {
  return useQuery({
    queryKey: queryKeys.salesAnalytics(statusFilter),
    queryFn: () => api.getSalesAnalytics(statusFilter),
    staleTime: 5 * 60_000, // 5 minutes fresh for analytics
    ...options,
  });
}
