import { useState, useCallback, useEffect } from 'react';
import { getOrdersPaginated } from '../services/api';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

/**
 * Parse URL params to initial state
 */
const parseInitialState = (getIntParam) => {
  const page = getIntParam('page', 1);
  const limit = getIntParam('limit', 10);
  
  return {
    page: page < 1 ? 1 : page,
    limit: PAGE_SIZE_OPTIONS.includes(limit) ? limit : 10,
  };
};

/**
 * Custom hook for managing order pagination and fetching
 * @param {Function} getIntParam - Function to get integer URL parameter
 * @returns {Object} - Orders data, pagination state and handlers
 */
export const useOrderPagination = (getIntParam) => {
  // Parse initial state from URL
  const initialState = parseInitialState(getIntParam);
  
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ 
    page: initialState.page, 
    limit: initialState.limit, 
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
