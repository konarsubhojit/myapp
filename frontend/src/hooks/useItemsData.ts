import { useState, useCallback, useEffect } from 'react';
import { getItemsPaginated } from '../services/api';
import type { Item, PaginatedResult, PaginationInfo } from '../types';

type AllowedLimit = 10 | 20 | 50;
const ITEMS_PER_PAGE = 10; // Fixed page size for infinite scroll

interface ItemsDataResult {
  items: Item[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string;
  search: string;
  searchInput: string;
  setSearchInput: (value: string) => void;
  handleSearch: (e: React.FormEvent) => void;
  clearSearch: () => void;
  loadMore: () => void;
  fetchItems: () => Promise<void>;
  setError: (error: string) => void;
}

/**
 * Custom hook for managing active items data with infinite scroll
 */
export const useItemsData = (): ItemsDataResult => {
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [search, setSearch] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const fetchItems = useCallback(async (pageNum: number, appendMode: boolean): Promise<void> => {
    if (appendMode) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError('');
    
    try {
      const result = await getItemsPaginated({ 
        page: pageNum, 
        limit: ITEMS_PER_PAGE, 
        search: search 
      });
      
      // Defensive check: ensure result.items exists and is an array
      if (!result.items || !Array.isArray(result.items)) {
        throw new Error('Invalid response format: items must be an array');
      }
      
      if (appendMode) {
        // Append new items for infinite scroll
        setItems(prev => [...prev, ...result.items]);
      } else {
        // Replace items for initial load or search
        setItems(result.items);
      }
      
      setTotalPages(result.pagination?.totalPages || 0);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch items');
      if (!appendMode) {
        setItems([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search]);

  // Initial fetch
  useEffect(() => {
    fetchItems(1, false);
  }, [search]); // Re-fetch from page 1 when search changes

  const loadMore = useCallback((): void => {
    if (!loadingMore && page < totalPages) {
      fetchItems(page + 1, true);
    }
  }, [loadingMore, page, totalPages, fetchItems]);

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const clearSearch = (): void => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const refetchItems = async (): Promise<void> => {
    await fetchItems(1, false);
  };

  return {
    items,
    loading,
    loadingMore,
    hasMore: page < totalPages,
    error,
    search,
    searchInput,
    setSearchInput,
    handleSearch,
    clearSearch,
    loadMore,
    fetchItems: refetchItems,
    setError,
  };
};
