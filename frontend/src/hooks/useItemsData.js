import { useState, useCallback, useEffect } from 'react';
import { getItemsPaginated } from '../services/api';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

/**
 * Parse URL params to initial state
 */
const parseInitialState = (getParam, getIntParam) => {
  const page = getIntParam('page', 1);
  const limit = getIntParam('limit', 10);
  
  return {
    page: page < 1 ? 1 : page,
    limit: PAGE_SIZE_OPTIONS.includes(limit) ? limit : 10,
    search: getParam('search', ''),
  };
};

/**
 * Custom hook for managing active items data, pagination, and search
 * @param {Function} getParam - Function to get URL parameter
 * @param {Function} getIntParam - Function to get integer URL parameter
 * @returns {Object} - Items data, pagination, search state and handlers
 */
export const useItemsData = (getParam, getIntParam) => {
  // Parse initial state from URL
  const initialState = parseInitialState(getParam, getIntParam);
  
  const [itemsData, setItemsData] = useState({ 
    items: [], 
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } 
  });
  const [search, setSearch] = useState(initialState.search);
  const [searchInput, setSearchInput] = useState(initialState.search);
  const [pagination, setPagination] = useState({ 
    page: initialState.page, 
    limit: initialState.limit 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getItemsPaginated({ 
        page: pagination.page, 
        limit: pagination.limit, 
        search: search 
      });
      setItemsData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleLimitChange = (limit) => {
    setPagination({ page: 1, limit });
  };

  return {
    items: itemsData.items,
    paginationData: itemsData.pagination,
    search,
    searchInput,
    loading,
    error,
    setSearchInput,
    handleSearch,
    clearSearch,
    handlePageChange,
    handleLimitChange,
    fetchItems,
    setError,
  };
};
