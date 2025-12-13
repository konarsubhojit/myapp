import { useQuery, type UseQueryResult, type UseQueryOptions } from '@tanstack/react-query';
import * as api from '../../services/api';
import { queryKeys, type PaginationParams } from '../../queryKeys';
import type { Feedback, PaginatedFeedbacksResult, FeedbackStats } from '../../types';

/**
 * Query hook for fetching all feedbacks (non-paginated)
 */
export function useFeedbacks(
  options?: Omit<UseQueryOptions<Feedback[], Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<Feedback[], Error> {
  return useQuery({
    queryKey: queryKeys.feedbacks(),
    queryFn: api.getFeedbacks,
    staleTime: 2 * 60_000, // 2 minutes fresh
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
    staleTime: 2 * 60_000,
    placeholderData: (previousData) => previousData,
    ...options,
  });
}

/**
 * Query hook for fetching a single feedback by ID
 */
export function useFeedback(
  id: number | string | undefined,
  options?: Omit<UseQueryOptions<Feedback, Error>, 'queryKey' | 'queryFn' | 'enabled'>
): UseQueryResult<Feedback, Error> {
  return useQuery({
    queryKey: queryKeys.feedback(id ?? 0),
    queryFn: () => api.getFeedback(id!),
    enabled: !!id, // Only fetch when id exists
    staleTime: 2 * 60_000,
    ...options,
  });
}

/**
 * Query hook for fetching feedback by order ID
 */
export function useFeedbackByOrderId(
  orderId: number | string | undefined,
  options?: Omit<UseQueryOptions<Feedback | null, Error>, 'queryKey' | 'queryFn' | 'enabled'>
): UseQueryResult<Feedback | null, Error> {
  return useQuery({
    queryKey: queryKeys.feedbackByOrder(orderId ?? 0),
    queryFn: () => api.getFeedbackByOrderId(orderId!),
    enabled: !!orderId, // Only fetch when orderId exists
    staleTime: 2 * 60_000,
    ...options,
  });
}

/**
 * Query hook for fetching feedback statistics
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
