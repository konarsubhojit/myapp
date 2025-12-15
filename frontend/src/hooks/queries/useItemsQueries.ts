import { useQuery, type UseQueryResult, type UseQueryOptions } from '@tanstack/react-query';
import * as api from '../../services/api';
import { queryKeys, type ItemsCursorParams } from '../../queryKeys';
import type { Item, CursorPaginatedResult } from '../../types';

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
 * Query hook for fetching cursor-paginated items
 * Uses placeholderData to keep previous data while fetching new page
 */
export function useItemsPaginated(
  params: ItemsCursorParams,
  options?: Omit<UseQueryOptions<CursorPaginatedResult<Item>, Error>, 'queryKey' | 'queryFn' | 'placeholderData'>
): UseQueryResult<CursorPaginatedResult<Item>, Error> {
  return useQuery({
    queryKey: queryKeys.itemsCursor(params),
    queryFn: () => api.getItemsPaginated(params),
    placeholderData: (previousData) => previousData,
    ...options,
  });
}

/**
 * Query hook for fetching deleted items with cursor pagination
 * Uses placeholderData to keep previous data while fetching new page
 */
export function useDeletedItemsQuery(
  params: ItemsCursorParams,
  options?: Omit<UseQueryOptions<CursorPaginatedResult<Item>, Error>, 'queryKey' | 'queryFn' | 'placeholderData'>
): UseQueryResult<CursorPaginatedResult<Item>, Error> {
  return useQuery({
    queryKey: queryKeys.deletedItems(params),
    queryFn: () => api.getDeletedItems(params),
    placeholderData: (previousData) => previousData,
    ...options,
  });
}
