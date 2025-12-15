import { useState, useCallback, useEffect } from 'react';
import { getItemsPaginated } from '../services/api';
import type { Item } from '../types';

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
 * Custom hook for managing active items data with cursor-based infinite scroll
 */
export const useItemsData = (): ItemsDataResult => {
  const [items, setItems] = useState<Item[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  // Start with loading=true to prevent flash of "no items" on initial load
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const fetchItems = useCallback(async (cursor: string | null, appendMode: boolean): Promise<void> => {
    if (appendMode) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError('');
    
    try {
      const result = await getItemsPaginated({ 
        limit: ITEMS_PER_PAGE,
        cursor,
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
      
      setNextCursor(result.page.nextCursor);
      setHasMore(result.page.hasMore);
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
    fetchItems(null, false);
  }, [search]); // Re-fetch from beginning when search changes

  const loadMore = useCallback((): void => {
    if (!loadingMore && hasMore && nextCursor) {
      fetchItems(nextCursor, true);
    }
  }, [loadingMore, hasMore, nextCursor, fetchItems]);

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const clearSearch = (): void => {
    setSearchInput('');
    setSearch('');
  };

  const refetchItems = async (): Promise<void> => {
    await fetchItems(null, false);
  };

  return {
    items,
    loading,
    loadingMore,
    hasMore,
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
