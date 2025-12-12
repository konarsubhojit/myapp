import { useState, useCallback, useEffect } from 'react';
import { getDeletedItems } from '../services/api';
import type { Item, PaginatedResult, PaginationInfo } from '../types';

type AllowedLimit = 10 | 20 | 50;

interface UseDeletedItemsResult {
  deletedItems: Item[];
  deletedPaginationData: PaginationInfo;
  deletedSearch: string;
  deletedSearchInput: string;
  loadingDeleted: boolean;
  setDeletedSearchInput: (value: string) => void;
  handleDeletedSearch: (e: React.FormEvent) => void;
  clearDeletedSearch: () => void;
  handleDeletedPageChange: (page: number) => void;
  handleDeletedLimitChange: (limit: AllowedLimit) => void;
  fetchDeletedItems: () => Promise<void>;
}

/**
 * Custom hook for managing deleted items data, pagination, and search
 */
export const useDeletedItems = (showDeleted: boolean): UseDeletedItemsResult => {
  const [deletedItemsData, setDeletedItemsData] = useState<PaginatedResult<Item>>({ 
    items: [], 
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } 
  });
  const [deletedSearch, setDeletedSearch] = useState<string>('');
  const [deletedSearchInput, setDeletedSearchInput] = useState<string>('');
  const [deletedPagination, setDeletedPagination] = useState<{ page: number; limit: AllowedLimit }>({ page: 1, limit: 10 });
  const [loadingDeleted, setLoadingDeleted] = useState<boolean>(false);

  const fetchDeletedItems = useCallback(async (): Promise<void> => {
    setLoadingDeleted(true);
    try {
      const result = await getDeletedItems({ 
        page: deletedPagination.page, 
        limit: deletedPagination.limit, 
        search: deletedSearch 
      });
      // Defensive check: ensure result.items exists and is an array
      if (!result.items || !Array.isArray(result.items)) {
        throw new Error('Invalid response format: items must be an array');
      }
      setDeletedItemsData({
        items: result.items,
        pagination: result.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }
      });
    } catch (err) {
      console.error('Failed to fetch deleted items:', err);
      // Set empty array on error to prevent undefined errors
      setDeletedItemsData({ 
        items: [], 
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } 
      });
    } finally {
      setLoadingDeleted(false);
    }
  }, [deletedPagination.page, deletedPagination.limit, deletedSearch]);

  useEffect(() => {
    if (showDeleted) {
      fetchDeletedItems();
    }
  }, [showDeleted, fetchDeletedItems]);

  const handleDeletedSearch = (e: React.FormEvent): void => {
    e.preventDefault();
    setDeletedSearch(deletedSearchInput);
    setDeletedPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearDeletedSearch = (): void => {
    setDeletedSearchInput('');
    setDeletedSearch('');
    setDeletedPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDeletedPageChange = (page: number): void => {
    setDeletedPagination(prev => ({ ...prev, page }));
  };

  const handleDeletedLimitChange = (limit: AllowedLimit): void => {
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
