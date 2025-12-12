import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDeletedItems } from '../../hooks/useDeletedItems';
import * as api from '../../services/api';

vi.mock('../../services/api', () => ({
  getDeletedItems: vi.fn(),
}));

describe('useDeletedItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useDeletedItems(false));

    expect(result.current.deletedItems).toEqual([]);
    expect(result.current.deletedPaginationData).toEqual({ 
      page: 1, 
      limit: 10, 
      total: 0, 
      totalPages: 0 
    });
    expect(result.current.deletedSearch).toBe('');
    expect(result.current.deletedSearchInput).toBe('');
    expect(result.current.loadingDeleted).toBe(false);
  });

  it('should not fetch items when showDeleted is false', () => {
    renderHook(() => useDeletedItems(false));
    expect(api.getDeletedItems).not.toHaveBeenCalled();
  });

  it('should fetch items when showDeleted is true', async () => {
    const mockData = {
      items: [{ id: '1', name: 'Deleted Item', isDeleted: true }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
    };

    api.getDeletedItems.mockResolvedValue(mockData);

    const { result } = renderHook(() => useDeletedItems(true));

    await waitFor(() => {
      expect(result.current.loadingDeleted).toBe(false);
    });

    expect(api.getDeletedItems).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      search: ''
    });
    expect(result.current.deletedItems).toEqual(mockData.items);
    expect(result.current.deletedPaginationData).toEqual(mockData.pagination);
  });

  it('should handle search input changes', () => {
    const { result } = renderHook(() => useDeletedItems(false));

    act(() => {
      result.current.setDeletedSearchInput('test query');
    });

    expect(result.current.deletedSearchInput).toBe('test query');
    expect(result.current.deletedSearch).toBe(''); // Search not submitted yet
  });

  it('should handle search submission', async () => {
    const mockData = {
      items: [{ id: '1', name: 'Found Item' }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
    };

    api.getDeletedItems.mockResolvedValue(mockData);

    const { result } = renderHook(() => useDeletedItems(true));

    await waitFor(() => {
      expect(result.current.loadingDeleted).toBe(false);
    });

    act(() => {
      result.current.setDeletedSearchInput('test');
    });

    act(() => {
      result.current.handleDeletedSearch({ preventDefault: vi.fn() });
    });

    expect(result.current.deletedSearch).toBe('test');
  });

  it('should reset page to 1 when searching', async () => {
    api.getDeletedItems.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    });

    const { result } = renderHook(() => useDeletedItems(true));

    await waitFor(() => {
      expect(result.current.loadingDeleted).toBe(false);
    });

    // Change page first
    act(() => {
      result.current.handleDeletedPageChange(2);
    });

    await waitFor(() => {
      expect(api.getDeletedItems).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });

    // Then perform search
    act(() => {
      result.current.setDeletedSearchInput('query');
    });

    act(() => {
      result.current.handleDeletedSearch({ preventDefault: vi.fn() });
    });

    await waitFor(() => {
      expect(api.getDeletedItems).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, search: 'query' })
      );
    });
  });

  it('should clear search', async () => {
    api.getDeletedItems.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    });

    const { result } = renderHook(() => useDeletedItems(true));

    await waitFor(() => {
      expect(result.current.loadingDeleted).toBe(false);
    });

    act(() => {
      result.current.setDeletedSearchInput('test');
    });

    act(() => {
      result.current.handleDeletedSearch({ preventDefault: vi.fn() });
    });

    await waitFor(() => {
      expect(result.current.deletedSearch).toBe('test');
    });

    expect(result.current.deletedSearchInput).toBe('test');

    act(() => {
      result.current.clearDeletedSearch();
    });

    expect(result.current.deletedSearchInput).toBe('');
    expect(result.current.deletedSearch).toBe('');
  });

  it('should handle page change', async () => {
    api.getDeletedItems.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    });

    const { result } = renderHook(() => useDeletedItems(true));

    await waitFor(() => {
      expect(result.current.loadingDeleted).toBe(false);
    });

    act(() => {
      result.current.handleDeletedPageChange(3);
    });

    await waitFor(() => {
      expect(api.getDeletedItems).toHaveBeenCalledWith(
        expect.objectContaining({ page: 3 })
      );
    });
  });

  it('should handle limit change and reset page', async () => {
    api.getDeletedItems.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    });

    const { result } = renderHook(() => useDeletedItems(true));

    await waitFor(() => {
      expect(result.current.loadingDeleted).toBe(false);
    });

    act(() => {
      result.current.handleDeletedLimitChange(20);
    });

    await waitFor(() => {
      expect(api.getDeletedItems).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 20 })
      );
    });
  });

  it('should handle fetch errors gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.getDeletedItems.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useDeletedItems(true));

    await waitFor(() => {
      expect(result.current.loadingDeleted).toBe(false);
    });

    expect(consoleError).toHaveBeenCalledWith(
      'Failed to fetch deleted items:',
      expect.any(Error)
    );

    consoleError.mockRestore();
  });

  it('should set loading state during fetch', async () => {
    api.getDeletedItems.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        items: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
      }), 100))
    );

    const { result } = renderHook(() => useDeletedItems(true));

    expect(result.current.loadingDeleted).toBe(true);

    await waitFor(() => {
      expect(result.current.loadingDeleted).toBe(false);
    });
  });

  it('should allow manual fetch with fetchDeletedItems', async () => {
    const mockData = {
      items: [{ id: '1', name: 'Item' }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
    };

    api.getDeletedItems.mockResolvedValue(mockData);

    const { result } = renderHook(() => useDeletedItems(false));

    await act(async () => {
      await result.current.fetchDeletedItems();
    });

    expect(api.getDeletedItems).toHaveBeenCalled();
    expect(result.current.deletedItems).toEqual(mockData.items);
  });

  it('should handle undefined items array from API response', async () => {
    // Mock API returning malformed response with undefined items
    api.getDeletedItems.mockResolvedValue({
      items: undefined,
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    });

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useDeletedItems(true));

    await waitFor(() => {
      expect(result.current.loadingDeleted).toBe(false);
    });

    // Should default to empty array instead of undefined
    expect(result.current.deletedItems).toEqual([]);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('should handle null items array from API response', async () => {
    // Mock API returning malformed response with null items
    api.getDeletedItems.mockResolvedValue({
      items: null,
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    });

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useDeletedItems(true));

    await waitFor(() => {
      expect(result.current.loadingDeleted).toBe(false);
    });

    // Should default to empty array instead of null
    expect(result.current.deletedItems).toEqual([]);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('should handle non-array items from API response', async () => {
    // Mock API returning malformed response with non-array items
    api.getDeletedItems.mockResolvedValue({
      items: 'invalid',
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    });

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useDeletedItems(true));

    await waitFor(() => {
      expect(result.current.loadingDeleted).toBe(false);
    });

    // Should default to empty array
    expect(result.current.deletedItems).toEqual([]);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('should handle missing pagination from API response', async () => {
    // Mock API returning response without pagination
    api.getDeletedItems.mockResolvedValue({
      items: [{ id: '1', name: 'Item' }],
      pagination: undefined
    });

    const { result } = renderHook(() => useDeletedItems(true));

    await waitFor(() => {
      expect(result.current.loadingDeleted).toBe(false);
    });

    // Should use default pagination
    expect(result.current.deletedPaginationData).toEqual({ 
      page: 1, 
      limit: 10, 
      total: 0, 
      totalPages: 0 
    });
  });

  it('should set empty items on error to prevent undefined errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.getDeletedItems.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDeletedItems(true));

    await waitFor(() => {
      expect(result.current.loadingDeleted).toBe(false);
    });

    // Should have empty array instead of undefined
    expect(result.current.deletedItems).toEqual([]);
    expect(result.current.deletedPaginationData).toEqual({ 
      page: 1, 
      limit: 10, 
      total: 0, 
      totalPages: 0 
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
