import { useState, useCallback, useEffect } from 'react';
import { getItemsPaginated } from '../services/api';
import type { Item, PaginatedResult, PaginationInfo } from '../types';

type AllowedLimit = 10 | 20 | 50;
const PAGE_SIZE_OPTIONS = new Set<AllowedLimit>([10, 20, 50]);

interface InitialState {
  page: number;
  limit: AllowedLimit;
  search: string;
}

/**
 * Parse URL params to initial state
 */
const parseInitialState = (
  getParam: (key: string, defaultValue: string) => string,
  getIntParam: (key: string, defaultValue: number) => number
): InitialState => {
  const page = getIntParam('page', 1);
  const limit = getIntParam('limit', 10);
  
  return {
    page: Math.max(1, page),
    limit: PAGE_SIZE_OPTIONS.has(limit as AllowedLimit) ? limit as AllowedLimit : 10,
    search: getParam('search', ''),
  };
};

interface ItemsDataResult {
  items: Item[];
  paginationData: PaginationInfo;
  search: string;
  searchInput: string;
  loading: boolean;
  error: string;
  setSearchInput: (value: string) => void;
  handleSearch: (e: React.FormEvent) => void;
  clearSearch: () => void;
  handlePageChange: (page: number) => void;
  handleLimitChange: (limit: AllowedLimit) => void;
  fetchItems: () => Promise<void>;
  setError: (error: string) => void;
}

/**
 * Custom hook for managing active items data, pagination, and search
 */
export const useItemsData = (
  getParam: (key: string, defaultValue: string) => string,
  getIntParam: (key: string, defaultValue: number) => number
): ItemsDataResult => {
  // Parse initial state from URL
  const initialState = parseInitialState(getParam, getIntParam);
  
  const [itemsData, setItemsData] = useState<PaginatedResult<Item>>({ 
    items: [], 
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } 
  });
  const [search, setSearch] = useState<string>(initialState.search);
  const [searchInput, setSearchInput] = useState<string>(initialState.search);
  const [pagination, setPagination] = useState<{ page: number; limit: AllowedLimit }>({ 
    page: initialState.page, 
    limit: initialState.limit 
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const fetchItems = useCallback(async (): Promise<void> => {
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
      setError(err instanceof Error ? err.message : 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault();
    setSearch(searchInput);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearSearch = (): void => {
    setSearchInput('');
    setSearch('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number): void => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleLimitChange = (limit: AllowedLimit): void => {
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
