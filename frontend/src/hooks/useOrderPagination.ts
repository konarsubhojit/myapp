import { useState, useCallback, useEffect } from 'react';
import { getOrdersPaginated } from '../services/api';
import type { Order } from '../types';

const ORDERS_PER_PAGE = 10; // Fixed page size for infinite scroll

interface UseOrderPaginationResult {
  orders: Order[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string;
  loadMore: () => void;
  fetchOrders: () => Promise<void>;
}

/**
 * Custom hook for managing order data with infinite scroll
 */
export const useOrderPagination = (): UseOrderPaginationResult => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  // Start with loading=true to prevent flash of "no orders" on initial load
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const fetchOrders = useCallback(async (pageNum: number, appendMode: boolean): Promise<void> => {
    if (appendMode) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError('');
    
    try {
      const result = await getOrdersPaginated({ page: pageNum, limit: ORDERS_PER_PAGE });
      
      // Defensive check: ensure result.orders exists and is an array
      const ordersData = result.orders || [];
      if (!Array.isArray(ordersData)) {
        throw new Error('Invalid response format: orders must be an array');
      }
      
      if (appendMode) {
        // Append new orders for infinite scroll
        setOrders(prev => [...prev, ...ordersData]);
      } else {
        // Replace orders for initial load
        setOrders(ordersData);
      }
      
      setTotalPages(result.pagination?.totalPages || 0);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      if (!appendMode) {
        setOrders([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchOrders(1, false);
  }, [fetchOrders]);

  const loadMore = useCallback((): void => {
    if (!loadingMore && page < totalPages) {
      fetchOrders(page + 1, true);
    }
  }, [loadingMore, page, totalPages, fetchOrders]);

  const refetchOrders = async (): Promise<void> => {
    await fetchOrders(1, false);
  };

  return {
    orders,
    loading,
    loadingMore,
    hasMore: page < totalPages,
    error,
    loadMore,
    fetchOrders: refetchOrders,
  };
};
