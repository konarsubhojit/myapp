import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import * as api from '../../services/api';
import type { Order, CreateOrderData, UpdateOrderData } from '../../types';

/**
 * Mutation hook for creating an order
 * Invalidates orders and analytics caches on success
 */
export function useCreateOrder(): UseMutationResult<Order, Error, CreateOrderData> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createOrder,
    onSuccess: () => {
      // Invalidate all orders-related queries
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      // Invalidate analytics since orders affect sales data
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

/**
 * Mutation hook for updating an order
 * Invalidates orders, feedbacks, and analytics caches on success
 */
export function useUpdateOrder(): UseMutationResult<Order, Error, { id: number | string; data: UpdateOrderData }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => api.updateOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      // Feedbacks may show order status
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
