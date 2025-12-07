import { useState, useCallback, useEffect } from 'react';
import { getOrdersPaginated } from '../services/api';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

/**
 * Custom hook for managing order pagination and fetching
 * @returns {Object} - Orders data, pagination state and handlers
 */
export const useOrderPagination = () => {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ 
    page: 1, 
    limit: 10, 
    total: 0, 
    totalPages: 0 
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchOrders = useCallback(async (page, limit) => {
    setLoading(true);
    setError('');
    try {
      const result = await getOrdersPaginated({ page, limit });
      setOrders(result.orders);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(pagination.page, pagination.limit);
  }, [pagination.page, pagination.limit, fetchOrders]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handlePageSizeChange = (newLimit) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
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
