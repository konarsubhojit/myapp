import { useQuery, type UseQueryResult, type UseQueryOptions } from '@tanstack/react-query';
import * as api from '../../services/api';
import { queryKeys, type PaginationParams } from '../../queryKeys';
import type { Feedback, PaginatedFeedbacksResult, FeedbackStats } from '../../types';

/**
 * Query hook for fetching all feedbacks (non-paginated)
 * Uses default staleTime from queryClient (2 minutes)
 */
export function useFeedbacks(
  options?: Omit<UseQueryOptions<Feedback[], Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<Feedback[], Error> {
  return useQuery({
    queryKey: queryKeys.feedbacks(),
    queryFn: api.getFeedbacks,
    ...options,
  });
}

/**
 * Query hook for fetching paginated feedbacks
 * Uses placeholderData to keep previous data while fetching new page
 */
export function useFeedbacksPaginated(
  params: PaginationParams,
  options?: Omit<UseQueryOptions<PaginatedFeedbacksResult, Error>, 'queryKey' | 'queryFn' | 'placeholderData'>
): UseQueryResult<PaginatedFeedbacksResult, Error> {
  return useQuery({
    queryKey: queryKeys.feedbacksPaginated(params),
    queryFn: () => api.getFeedbacksPaginated(params),
    placeholderData: (previousData) => previousData,
    ...options,
  });
}

/**
 * Query hook for fetching a single feedback by ID
 * Uses default staleTime from queryClient (2 minutes)
 */
export function useFeedback(
  id: number | string | undefined,
  options?: Omit<UseQueryOptions<Feedback, Error>, 'queryKey' | 'queryFn' | 'enabled'>
): UseQueryResult<Feedback, Error> {
  return useQuery({
    queryKey: queryKeys.feedback(id ?? 'undefined'),
    queryFn: () => api.getFeedback(id!),
    enabled: !!id, // Only fetch when id exists
    ...options,
  });
}

/**
 * Query hook for fetching feedback by order ID
 * Uses default staleTime from queryClient (2 minutes)
 */
export function useFeedbackByOrderId(
  orderId: number | string | undefined,
  options?: Omit<UseQueryOptions<Feedback | null, Error>, 'queryKey' | 'queryFn' | 'enabled'>
): UseQueryResult<Feedback | null, Error> {
  return useQuery({
    queryKey: queryKeys.feedbackByOrder(orderId ?? 'undefined'),
    queryFn: () => api.getFeedbackByOrderId(orderId!),
    enabled: !!orderId, // Only fetch when orderId exists
    ...options,
  });
}

/**
 * Query hook for fetching feedback statistics
 * Longer stale time (5 min) for stats that change less frequently
 */
export function useFeedbackStats(
  options?: Omit<UseQueryOptions<FeedbackStats, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<FeedbackStats, Error> {
  return useQuery({
    queryKey: queryKeys.feedbackStats(),
    queryFn: api.getFeedbackStats,
    staleTime: 5 * 60_000, // 5 minutes fresh for stats
    ...options,
  });
}
