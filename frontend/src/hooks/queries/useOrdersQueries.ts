import { useQuery, type UseQueryResult, type UseQueryOptions } from '@tanstack/react-query';
import * as api from '../../services/api';
import { queryKeys, type PaginationParams } from '../../queryKeys';
import type { Order, PaginatedOrdersResult } from '../../types';

/**
 * Query hook for fetching all orders (non-paginated)
 * Uses default staleTime from queryClient (2 minutes)
 */
export function useOrdersAll(
  options?: Omit<UseQueryOptions<Order[], Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<Order[], Error> {
  return useQuery({
    queryKey: queryKeys.ordersAll(),
    queryFn: api.getOrders,
    ...options,
  });
}

/**
 * Query hook for fetching paginated orders
 * Uses placeholderData to keep previous data while fetching new page
 */
export function useOrdersPaginated(
  params: PaginationParams,
  options?: Omit<UseQueryOptions<PaginatedOrdersResult, Error>, 'queryKey' | 'queryFn' | 'placeholderData'>
): UseQueryResult<PaginatedOrdersResult, Error> {
  return useQuery({
    queryKey: queryKeys.ordersPaginated(params),
    queryFn: () => api.getOrdersPaginated(params),
    placeholderData: (previousData) => previousData,
    ...options,
  });
}

/**
 * Query hook for fetching a single order by ID
 * Uses default staleTime from queryClient (2 minutes)
 */
export function useOrder(
  id: number | string | undefined,
  options?: Omit<UseQueryOptions<Order, Error>, 'queryKey' | 'queryFn' | 'enabled'>
): UseQueryResult<Order, Error> {
  return useQuery({
    queryKey: queryKeys.order(id ?? 0),
    queryFn: () => api.getOrder(id!),
    enabled: !!id, // Only fetch when id exists
    ...options,
  });
}

/**
 * Query hook for fetching priority orders
 * Shorter stale time (10s) for more frequent updates
 */
export function usePriorityOrdersQuery(
  options?: Omit<UseQueryOptions<Order[], Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<Order[], Error> {
  return useQuery({
    queryKey: queryKeys.priorityOrders(),
    queryFn: api.getPriorityOrders,
    staleTime: 10_000, // 10 seconds fresh for priority data
    ...options,
  });
}
