import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import * as api from '../../services/api';
import type { Item, CreateItemData, UpdateItemData } from '../../types';

/**
 * Mutation hook for creating an item
 * Invalidates items and analytics caches on success
 */
export function useCreateItem(): UseMutationResult<Item, Error, CreateItemData> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createItem,
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
export function useUpdateItem(): UseMutationResult<Item, Error, { id: number | string; data: UpdateItemData }> {
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
export function useDeleteItem(): UseMutationResult<{ message: string }, Error, number | string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteItem,
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
export function useRestoreItem(): UseMutationResult<Item, Error, number | string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.restoreItem,
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
export function usePermanentlyDeleteItem(): UseMutationResult<{ message: string }, Error, number | string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.permanentlyDeleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
