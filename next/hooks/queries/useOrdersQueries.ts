import { useQuery, type UseQueryResult, type UseQueryOptions } from '@tanstack/react-query';
import * as api from '@/lib/api/client';
import { queryKeys } from '@/lib/queryKeys';
import type { Order, OrderId, CursorPaginatedResult } from '@/types';

/**
 * Query hook for fetching all orders
 * Returns cursor paginated result
 */
export function useOrdersAll(
  options?: Omit<UseQueryOptions<CursorPaginatedResult<Order>, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<CursorPaginatedResult<Order>, Error> {
  return useQuery({
    queryKey: queryKeys.ordersAll(),
    queryFn: () => api.getOrders(),
    ...options,
  });
}

/**
 * Query hook for fetching paginated orders
 */
export function useOrdersPaginated(
  page: number,
  limit: number,
  options?: Omit<UseQueryOptions<CursorPaginatedResult<Order>, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<CursorPaginatedResult<Order>, Error> {
  return useQuery({
    queryKey: queryKeys.ordersPaginated({ page, limit }),
    queryFn: () => api.getOrdersPaginated({ page, limit }),
    ...options,
  });
}

/**
 * Query hook for fetching a single order by ID
 */
export function useOrder(
  id: OrderId,
  options?: Omit<UseQueryOptions<Order, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<Order, Error> {
  return useQuery({
    queryKey: queryKeys.order(id),
    queryFn: () => api.getOrder(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Query hook for fetching priority orders
 */
export function usePriorityOrdersQuery(
  options?: Omit<UseQueryOptions<Order[], Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<Order[], Error> {
  return useQuery({
    queryKey: queryKeys.priorityOrders(),
    queryFn: () => api.getPriorityOrders(),
    ...options,
  });
}
