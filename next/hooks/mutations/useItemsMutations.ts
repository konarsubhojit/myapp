import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import * as api from '@/lib/api/client';
import type { Item, CreateItemData, UpdateItemData, ItemId } from '@/types';

/**
 * Mutation hook for creating an item
 * Invalidates items and analytics caches on success
 */
export function useCreateItem(): UseMutationResult<Item, Error, CreateItemData> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.createItem(data),
    onSuccess: () => {
      // Invalidate all items-related queries
      queryClient.invalidateQueries({ queryKey: ['items'] });
      // Invalidate analytics since items affect sales data
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

/**
 * Mutation hook for updating an item
 * Invalidates items and analytics caches on success
 */
export function useUpdateItem(): UseMutationResult<Item, Error, { id: ItemId; data: UpdateItemData }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => api.updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

/**
 * Mutation hook for soft deleting an item
 * Invalidates items and analytics caches on success
 */
export function useDeleteItem(): UseMutationResult<void, Error, ItemId> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => api.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

/**
 * Mutation hook for restoring a soft-deleted item
 * Invalidates items and analytics caches on success
 */
export function useRestoreItem(): UseMutationResult<Item, Error, ItemId> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => api.restoreItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

/**
 * Mutation hook for permanently deleting an item
 * Invalidates items cache on success
 */
export function usePermanentlyDeleteItem(): UseMutationResult<void, Error, ItemId> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => api.permanentlyDeleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
