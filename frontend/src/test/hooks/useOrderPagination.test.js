import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOrderPagination } from '../../hooks/useOrderPagination';
import * as api from '../../services/api';

vi.mock('../../services/api', () => ({
  getOrdersPaginated: vi.fn(),
}));

describe('useOrderPagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    api.getOrdersPaginated.mockResolvedValue({
      orders: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    });

    const { result } = renderHook(() => useOrderPagination());

    expect(result.current.orders).toEqual([]);
    expect(result.current.pagination).toEqual({ 
      page: 1, 
      limit: 10, 
      total: 0, 
      totalPages: 0 
    });
    expect(result.current.initialLoading).toBe(true);
    expect(result.current.error).toBe('');
  });

  it('should fetch orders on mount', async () => {
    const mockData = {
      orders: [{ id: '1', customerName: 'John' }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
    };

    api.getOrdersPaginated.mockResolvedValue(mockData);

    const { result } = renderHook(() => useOrderPagination());

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false);
    });

    expect(api.getOrdersPaginated).toHaveBeenCalledWith({
      page: 1,
      limit: 10
    });
    expect(result.current.orders).toEqual(mockData.orders);
    expect(result.current.pagination).toEqual(mockData.pagination);
  });

  it('should handle page change', async () => {
    api.getOrdersPaginated.mockResolvedValue({
      orders: [],
      pagination: { page: 1, limit: 10, total: 100, totalPages: 10 }
    });

    const { result } = renderHook(() => useOrderPagination());

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false);
    });

    act(() => {
      result.current.handlePageChange(3);
    });

    await waitFor(() => {
      expect(api.getOrdersPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ page: 3 })
      );
    });
  });

  it('should not change page if out of range (too low)', async () => {
    api.getOrdersPaginated.mockResolvedValue({
      orders: [],
      pagination: { page: 1, limit: 10, total: 100, totalPages: 10 }
    });

    const { result } = renderHook(() => useOrderPagination());

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false);
    });

    const callCount = api.getOrdersPaginated.mock.calls.length;

    act(() => {
      result.current.handlePageChange(0); // Invalid page
    });

    // Should not trigger a new API call
    expect(api.getOrdersPaginated).toHaveBeenCalledTimes(callCount);
  });

  it('should not change page if out of range (too high)', async () => {
    api.getOrdersPaginated.mockResolvedValue({
      orders: [],
      pagination: { page: 1, limit: 10, total: 100, totalPages: 10 }
    });

    const { result } = renderHook(() => useOrderPagination());

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false);
    });

    const callCount = api.getOrdersPaginated.mock.calls.length;

    act(() => {
      result.current.handlePageChange(11); // Beyond totalPages
    });

    // Should not trigger a new API call
    expect(api.getOrdersPaginated).toHaveBeenCalledTimes(callCount);
  });

  it('should handle page size change and reset to page 1', async () => {
    api.getOrdersPaginated.mockResolvedValue({
      orders: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    });

    const { result } = renderHook(() => useOrderPagination());

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false);
    });

    act(() => {
      result.current.handlePageSizeChange(20);
    });

    await waitFor(() => {
      expect(api.getOrdersPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 20 })
      );
    });
  });

  it('should handle fetch errors', async () => {
    const error = new Error('Network Error');
    api.getOrdersPaginated.mockRejectedValue(error);

    const { result } = renderHook(() => useOrderPagination());

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network Error');
  });

  it('should handle fetch errors with default message', async () => {
    api.getOrdersPaginated.mockRejectedValue({});

    const { result } = renderHook(() => useOrderPagination());

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch orders');
  });

  it('should set loading state during fetch', async () => {
    api.getOrdersPaginated.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        orders: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
      }), 100))
    );

    const { result } = renderHook(() => useOrderPagination());

    expect(result.current.loading).toBe(true);
    expect(result.current.initialLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.initialLoading).toBe(false);
    });
  });

  it('should allow manual fetch with custom page and limit', async () => {
    const mockData = {
      orders: [{ id: '1', customerName: 'Jane' }],
      pagination: { page: 2, limit: 20, total: 40, totalPages: 2 }
    };

    api.getOrdersPaginated.mockResolvedValue(mockData);

    const { result } = renderHook(() => useOrderPagination());

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false);
    });

    api.getOrdersPaginated.mockClear();

    await act(async () => {
      await result.current.fetchOrders(2, 20);
    });

    expect(api.getOrdersPaginated).toHaveBeenCalledWith({ page: 2, limit: 20 });
    expect(result.current.orders).toEqual(mockData.orders);
    expect(result.current.pagination).toEqual(mockData.pagination);
  });

  it('should clear error on successful fetch', async () => {
    // First fail
    api.getOrdersPaginated.mockRejectedValueOnce(new Error('Error'));

    const { result } = renderHook(() => useOrderPagination());

    await waitFor(() => {
      expect(result.current.error).toBe('Error');
    });

    // Then succeed
    api.getOrdersPaginated.mockResolvedValue({
      orders: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    });

    await act(async () => {
      await result.current.fetchOrders(1, 10);
    });

    expect(result.current.error).toBe('');
  });

  it('should handle malformed API response with missing orders field', async () => {
    // API returns unexpected structure (e.g., { items: [...] } instead of { orders: [...] })
    api.getOrdersPaginated.mockResolvedValue({
      items: [{ id: '1', name: 'Item' }],  // Wrong field name
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
    });

    const { result } = renderHook(() => useOrderPagination());

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false);
    });

    // Should handle gracefully by setting empty array
    expect(result.current.orders).toEqual([]);
    expect(result.current.error).toBe('');
    expect(result.current.pagination.page).toBe(1);
  });

  it('should handle API response with non-array orders field', async () => {
    // API returns orders as object instead of array
    api.getOrdersPaginated.mockResolvedValue({
      orders: { id: '1', name: 'Not an array' },  // Wrong type
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
    });

    const { result } = renderHook(() => useOrderPagination());

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false);
    });

    // Should detect invalid format and set error
    expect(result.current.orders).toEqual([]);
    expect(result.current.error).toBe('Invalid response format: orders must be an array');
  });
});
