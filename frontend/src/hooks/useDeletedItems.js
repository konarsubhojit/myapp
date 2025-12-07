import { useState, useCallback, useEffect } from 'react';
import { getDeletedItems } from '../services/api';

/**
 * Custom hook for managing deleted items data, pagination, and search
 * @param {boolean} showDeleted - Whether to show deleted items
 * @returns {Object} - Deleted items data, pagination, search state and handlers
 */
export const useDeletedItems = (showDeleted) => {
  const [deletedItemsData, setDeletedItemsData] = useState({ 
    items: [], 
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } 
  });
  const [deletedSearch, setDeletedSearch] = useState('');
  const [deletedSearchInput, setDeletedSearchInput] = useState('');
  const [deletedPagination, setDeletedPagination] = useState({ page: 1, limit: 10 });
  const [loadingDeleted, setLoadingDeleted] = useState(false);

  const fetchDeletedItems = useCallback(async () => {
    setLoadingDeleted(true);
    try {
      const result = await getDeletedItems({ 
        page: deletedPagination.page, 
        limit: deletedPagination.limit, 
        search: deletedSearch 
      });
      setDeletedItemsData(result);
    } catch (err) {
      console.error('Failed to fetch deleted items:', err);
    } finally {
      setLoadingDeleted(false);
    }
  }, [deletedPagination.page, deletedPagination.limit, deletedSearch]);

  useEffect(() => {
    if (showDeleted) {
      fetchDeletedItems();
    }
  }, [showDeleted, fetchDeletedItems]);

  const handleDeletedSearch = (e) => {
    e.preventDefault();
    setDeletedSearch(deletedSearchInput);
    setDeletedPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearDeletedSearch = () => {
    setDeletedSearchInput('');
    setDeletedSearch('');
    setDeletedPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDeletedPageChange = (page) => {
    setDeletedPagination(prev => ({ ...prev, page }));
  };

  const handleDeletedLimitChange = (limit) => {
    setDeletedPagination({ page: 1, limit });
  };

  return {
    deletedItems: deletedItemsData.items,
    deletedPaginationData: deletedItemsData.pagination,
    deletedSearch,
    deletedSearchInput,
    loadingDeleted,
    setDeletedSearchInput,
    handleDeletedSearch,
    clearDeletedSearch,
    handleDeletedPageChange,
    handleDeletedLimitChange,
    fetchDeletedItems,
  };
};
