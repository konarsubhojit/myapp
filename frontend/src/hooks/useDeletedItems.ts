import { useState, useCallback, useEffect } from 'react';
import { getDeletedItems } from '../services/api';
import type { Item } from '../types';

const DELETED_ITEMS_PER_PAGE = 20;

interface UseDeletedItemsResult {
  deletedItems: Item[];
  loadingDeleted: boolean;
  loadingMoreDeleted: boolean;
  hasMoreDeleted: boolean;
  deletedSearch: string;
  deletedSearchInput: string;
  setDeletedSearchInput: (value: string) => void;
  handleDeletedSearch: (e: React.FormEvent) => void;
  clearDeletedSearch: () => void;
  loadMoreDeleted: () => void;
  fetchDeletedItems: () => Promise<void>;
}

/**
 * Custom hook for managing deleted items data with infinite scroll
 */
export const useDeletedItems = (showDeleted: boolean): UseDeletedItemsResult => {
  const [deletedItems, setDeletedItems] = useState<Item[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [deletedSearch, setDeletedSearch] = useState<string>('');
  const [deletedSearchInput, setDeletedSearchInput] = useState<string>('');
  const [loadingDeleted, setLoadingDeleted] = useState<boolean>(false);
  const [loadingMoreDeleted, setLoadingMoreDeleted] = useState<boolean>(false);

  const fetchDeletedItems = useCallback(async (pageNum: number, appendMode: boolean): Promise<void> => {
    if (appendMode) {
      setLoadingMoreDeleted(true);
    } else {
      setLoadingDeleted(true);
    }
    
    try {
      const result = await getDeletedItems({ 
        page: pageNum, 
        limit: DELETED_ITEMS_PER_PAGE, 
        search: deletedSearch 
      });
      
      // Defensive check: ensure result.items exists and is an array
      if (!result.items || !Array.isArray(result.items)) {
        throw new Error('Invalid response format: items must be an array');
      }
      
      if (appendMode) {
        setDeletedItems(prev => [...prev, ...result.items]);
      } else {
        setDeletedItems(result.items);
      }
      
      setTotalPages(result.pagination?.totalPages || 0);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to fetch deleted items:', err);
      if (!appendMode) {
        setDeletedItems([]);
      }
    } finally {
      setLoadingDeleted(false);
      setLoadingMoreDeleted(false);
    }
  }, [deletedSearch]);

  // Fetch deleted items when showDeleted becomes true or search changes
  useEffect(() => {
    if (showDeleted) {
      fetchDeletedItems(1, false);
    }
  }, [showDeleted, deletedSearch]);

  const loadMoreDeleted = useCallback((): void => {
    if (!loadingMoreDeleted && page < totalPages) {
      fetchDeletedItems(page + 1, true);
    }
  }, [loadingMoreDeleted, page, totalPages, fetchDeletedItems]);

  const handleDeletedSearch = (e: React.FormEvent): void => {
    e.preventDefault();
    setDeletedSearch(deletedSearchInput);
    setPage(1);
  };

  const clearDeletedSearch = (): void => {
    setDeletedSearchInput('');
    setDeletedSearch('');
    setPage(1);
  };

  const refetchDeletedItems = async (): Promise<void> => {
    await fetchDeletedItems(1, false);
  };

  return {
    deletedItems,
    loadingDeleted,
    loadingMoreDeleted,
    hasMoreDeleted: page < totalPages,
    deletedSearch,
    deletedSearchInput,
    setDeletedSearchInput,
    handleDeletedSearch,
    clearDeletedSearch,
    loadMoreDeleted,
    fetchDeletedItems: refetchDeletedItems,
  };
};
