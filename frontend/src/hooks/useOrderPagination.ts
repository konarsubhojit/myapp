import { useState, useCallback, useEffect } from 'react';
import { getOrdersPaginated } from '../services/api';
import type { Order, PaginationInfo } from '../types';

type AllowedLimit = 10 | 20 | 50;

interface UseOrderPaginationResult {
  orders: Order[];
  pagination: PaginationInfo;
  initialLoading: boolean;
  loading: boolean;
  error: string;
  fetchOrders: (page: number, limit: number) => Promise<void>;
  handlePageChange: (newPage: number) => void;
  handlePageSizeChange: (newLimit: AllowedLimit) => void;
}

/**
 * Custom hook for managing order pagination and fetching
 */
export const useOrderPagination = (): UseOrderPaginationResult => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ 
    page: 1, 
    limit: 10, 
    total: 0, 
    totalPages: 0 
  });
  // Separate state for requested page/limit to avoid infinite loop
  const [requestedPage, setRequestedPage] = useState<number>(1);
  const [requestedLimit, setRequestedLimit] = useState<number>(10);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const fetchOrders = useCallback(async (page: number, limit: number): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const result = await getOrdersPaginated({ page, limit });
      setOrders(result.orders);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(requestedPage, requestedLimit);
  }, [requestedPage, requestedLimit, fetchOrders]);

  const handlePageChange = (newPage: number): void => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setRequestedPage(newPage);
    }
  };

  const handlePageSizeChange = (newLimit: AllowedLimit): void => {
    setRequestedLimit(newLimit);
    setRequestedPage(1); // Reset to first page when changing page size
  };

  return {
    orders,
    pagination,
    initialLoading,
    loading,
    error,
    fetchOrders,
    handlePageChange,
    handlePageSizeChange,
  };
};
