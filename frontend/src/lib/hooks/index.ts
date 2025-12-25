// Items queries
export { useItems, useItemsPaginated, useDeletedItemsQuery } from '../../features/items/useItemsQueries';

// Orders queries
export { useOrdersAll, useOrdersPaginated, useOrder, usePriorityOrdersQuery } from '../../features/orders/useOrdersQueries';

// Feedbacks queries
export {
  useFeedbacks,
  useFeedbacksPaginated,
  useFeedback,
  useFeedbackByOrderId,
  useFeedbackStats,
} from '../../features/feedback/useFeedbacksQueries';

// Analytics queries
export { useSalesAnalyticsQuery } from '../../features/analytics/useAnalyticsQueries';
export { useSalesAnalyticsOptimized } from '../../features/analytics/useSalesAnalyticsOptimized';

// Re-export types from analytics
export type { ItemData, CustomerData, SourceData, RangeAnalytics } from '../../features/analytics/useSalesAnalytics';

// Re-export from orders
export { usePriorityOrders, getDaysUntilDelivery, getNotificationMessage } from '../../features/orders/usePriorityOrders';
export type { OrderWithPriority } from '../../features/orders/usePriorityOrders';

// Shared hooks
export { useImageProcessing } from './useImageProcessing';
export { useInfiniteScroll } from './useInfiniteScroll';
export { useUrlSync } from './useUrlSync';
