import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import * as api from '../../services/api';
import type { Feedback, CreateFeedbackData, UpdateFeedbackData, TokenGenerationResponse } from '../../types';

/**
 * Mutation hook for creating feedback
 * Invalidates feedbacks, orders, and analytics caches on success
 */
export function useCreateFeedback(): UseMutationResult<Feedback, Error, CreateFeedbackData> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createFeedback,
    onSuccess: (_data, variables) => {
      // Invalidate all feedbacks-related queries
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      // Invalidate specific order's feedback
      if (variables.orderId) {
        queryClient.invalidateQueries({ queryKey: ['feedbacks', 'byOrder', String(variables.orderId)] });
      }
      // Orders may show feedback status
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

/**
 * Mutation hook for updating feedback
 * Invalidates feedbacks and analytics caches on success
 */
export function useUpdateFeedback(): UseMutationResult<Feedback, Error, { id: number | string; data: UpdateFeedbackData }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => api.updateFeedback(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

/**
 * Mutation hook for generating a feedback token
 */
export function useGenerateFeedbackToken(): UseMutationResult<TokenGenerationResponse, Error, number | string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.generateFeedbackToken,
    onSuccess: () => {
      // Optionally invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
    },
  });
}
