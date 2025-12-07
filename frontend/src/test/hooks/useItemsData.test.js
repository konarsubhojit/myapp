import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useItemsData } from '../../hooks/useItemsData';
import * as api from '../../services/api';

vi.mock('../../services/api', () => ({
  getItemsPaginated: vi.fn(),
}));

describe('useItemsData', () => {
  const mockGetParam = vi.fn((key, defaultValue) => defaultValue || '');
  const mockGetIntParam = vi.fn((key, defaultValue) => defaultValue || 1);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useItemsData(mockGetParam, mockGetIntParam));

    expect(result.current.items).toEqual([]);
    expect(result.current.paginationData).toEqual({ 
      page: 1, 
      limit: 10, 
      total: 0, 
      totalPages: 0 
    });
    expect(result.current.search).toBe('');
    expect(result.current.searchInput).toBe('');
    expect(result.current.error).toBe('');
  });

  it('should parse initial state from URL params', () => {
    const getParam = vi.fn((key, defaultValue) => {
      if (key === 'search') return 'test query';
      return defaultValue;
    });
    const getIntParam = vi.fn((key, defaultValue) => {
      if (key === 'page') return 2;
      if (key === 'limit') return 20;
      return defaultValue;
    });

    api.getItemsPaginated.mockResolvedValue({
      items: [],
      pagination: { page: 2, limit: 20, total: 0, totalPages: 0 }
    });

    const { result } = renderHook(() => useItemsData(getParam, getIntParam));

    expect(result.current.search).toBe('test query');
    expect(result.current.searchInput).toBe('test query');
  });

  it('should fetch items on mount', async () => {
    const mockData = {
      items: [{ id: '1', name: 'Item 1' }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
    };

    api.getItemsPaginated.mockResolvedValue(mockData);

    const { result } = renderHook(() => useItemsData(mockGetParam, mockGetIntParam));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(api.getItemsPaginated).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      search: ''
    });
    expect(result.current.items).toEqual(mockData.items);
    expect(result.current.paginationData).toEqual(mockData.pagination);
  });

  it('should handle search input changes', () => {
    const { result } = renderHook(() => useItemsData(mockGetParam, mockGetIntParam));

    act(() => {
      result.current.setSearchInput('query');
    });

    expect(result.current.searchInput).toBe('query');
    expect(result.current.search).toBe(''); // Not submitted yet
  });

  it('should handle search submission', async () => {
    api.getItemsPaginated.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    });

    const { result } = renderHook(() => useItemsData(mockGetParam, mockGetIntParam));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setSearchInput('test');
    });

    act(() => {
      result.current.handleSearch({ preventDefault: vi.fn() });
    });

    await waitFor(() => {
      expect(api.getItemsPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'test', page: 1 })
      );
    });
  });

  it('should reset page to 1 when searching', async () => {
    api.getItemsPaginated.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    });

    const { result } = renderHook(() => useItemsData(mockGetParam, mockGetIntParam));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Change to page 2
    act(() => {
      result.current.handlePageChange(2);
    });

    await waitFor(() => {
      expect(api.getItemsPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });

    // Submit search
    act(() => {
      result.current.setSearchInput('query');
    });

    act(() => {
      result.current.handleSearch({ preventDefault: vi.fn() });
    });

    await waitFor(() => {
      expect(api.getItemsPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, search: 'query' })
      );
    });
  });

  it('should clear search', async () => {
    api.getItemsPaginated.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    });

    const { result } = renderHook(() => useItemsData(mockGetParam, mockGetIntParam));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setSearchInput('test');
    });

    act(() => {
      result.current.handleSearch({ preventDefault: vi.fn() });
    });

    await waitFor(() => {
      expect(result.current.search).toBe('test');
    });

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.searchInput).toBe('');
    expect(result.current.search).toBe('');
  });

  it('should handle page change', async () => {
    api.getItemsPaginated.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    });

    const { result } = renderHook(() => useItemsData(mockGetParam, mockGetIntParam));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.handlePageChange(3);
    });

    await waitFor(() => {
      expect(api.getItemsPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ page: 3 })
      );
    });
  });

  it('should handle limit change and reset page', async () => {
    api.getItemsPaginated.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    });

    const { result } = renderHook(() => useItemsData(mockGetParam, mockGetIntParam));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.handleLimitChange(20);
    });

    await waitFor(() => {
      expect(api.getItemsPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 20 })
      );
    });
  });

  it('should handle fetch errors', async () => {
    const error = new Error('API Error');
    api.getItemsPaginated.mockRejectedValue(error);

    const { result } = renderHook(() => useItemsData(mockGetParam, mockGetIntParam));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('API Error');
  });

  it('should set loading state during fetch', async () => {
    api.getItemsPaginated.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        items: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
      }), 100))
    );

    const { result } = renderHook(() => useItemsData(mockGetParam, mockGetIntParam));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should allow manual error setting', () => {
    const { result } = renderHook(() => useItemsData(mockGetParam, mockGetIntParam));

    act(() => {
      result.current.setError('Custom error');
    });

    expect(result.current.error).toBe('Custom error');
  });

  it('should validate page number from URL', () => {
    const getParam = vi.fn(() => null);
    const getIntParam = vi.fn((key, defaultValue) => {
      if (key === 'page') return -1; // Invalid page
      return defaultValue;
    });

    api.getItemsPaginated.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    });

    renderHook(() => useItemsData(getParam, getIntParam));

    expect(api.getItemsPaginated).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 }) // Should default to 1
    );
  });

  it('should validate limit from URL', () => {
    const getParam = vi.fn(() => null);
    const getIntParam = vi.fn((key, defaultValue) => {
      if (key === 'limit') return 999; // Invalid limit
      return defaultValue;
    });

    api.getItemsPaginated.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    });

    renderHook(() => useItemsData(getParam, getIntParam));

    expect(api.getItemsPaginated).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10 }) // Should default to 10
    );
  });

  it('should allow manual fetch', async () => {
    const mockData = {
      items: [{ id: '1', name: 'Item' }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
    };

    api.getItemsPaginated.mockResolvedValue(mockData);

    const { result } = renderHook(() => useItemsData(mockGetParam, mockGetIntParam));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    api.getItemsPaginated.mockClear();

    await act(async () => {
      await result.current.fetchItems();
    });

    expect(api.getItemsPaginated).toHaveBeenCalled();
  });
});
