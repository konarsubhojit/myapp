import { useQuery, type UseQueryResult, type UseQueryOptions } from '@tanstack/react-query';
import * as api from '../../services/api';
import { queryKeys, type ItemsPaginationParams } from '../../queryKeys';
import type { Item, PaginatedResult } from '../../types';

/**
 * Query hook for fetching all items (non-paginated)
 * Uses default staleTime from queryClient (2 minutes)
 */
export function useItems(
  options?: Omit<UseQueryOptions<Item[], Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<Item[], Error> {
  return useQuery({
    queryKey: queryKeys.items(),
    queryFn: api.getItems,
    ...options,
  });
}

/**
 * Query hook for fetching paginated items
 * Uses placeholderData to keep previous data while fetching new page
 */
export function useItemsPaginated(
  params: ItemsPaginationParams,
  options?: Omit<UseQueryOptions<PaginatedResult<Item>, Error>, 'queryKey' | 'queryFn' | 'placeholderData'>
): UseQueryResult<PaginatedResult<Item>, Error> {
  return useQuery({
    queryKey: queryKeys.itemsPaginated(params),
    queryFn: () => api.getItemsPaginated(params),
    placeholderData: (previousData) => previousData,
    ...options,
  });
}

/**
 * Query hook for fetching deleted items
 * Uses placeholderData to keep previous data while fetching new page
 */
export function useDeletedItemsQuery(
  params: ItemsPaginationParams,
  options?: Omit<UseQueryOptions<PaginatedResult<Item>, Error>, 'queryKey' | 'queryFn' | 'placeholderData'>
): UseQueryResult<PaginatedResult<Item>, Error> {
  return useQuery({
    queryKey: queryKeys.deletedItems(params),
    queryFn: () => api.getDeletedItems(params),
    placeholderData: (previousData) => previousData,
    ...options,
  });
}
