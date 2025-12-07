import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrderFilters } from '../../hooks/useOrderFilters';

describe('useOrderFilters', () => {
  const mockOrders = [
    {
      orderId: 'ORD-001',
      customerName: 'John Doe',
      customerId: 'C123',
      orderFrom: 'instagram',
      confirmationStatus: 'confirmed',
      paymentStatus: 'paid',
      totalPrice: 100,
      expectedDeliveryDate: '2024-01-15',
      createdAt: '2024-01-01',
    },
    {
      orderId: 'ORD-002',
      customerName: 'Jane Smith',
      customerId: 'C456',
      orderFrom: 'facebook',
      confirmationStatus: 'unconfirmed',
      paymentStatus: 'unpaid',
      totalPrice: 200,
      expectedDeliveryDate: '2024-01-10',
      createdAt: '2024-01-02',
    },
    {
      orderId: 'ORD-003',
      customerName: 'Bob Johnson',
      customerId: 'C789',
      orderFrom: 'whatsapp',
      confirmationStatus: 'confirmed',
      paymentStatus: 'partially_paid',
      totalPrice: 150,
      expectedDeliveryDate: null,
      createdAt: '2024-01-03',
    },
  ];

  it('should initialize with empty filters', () => {
    const { result } = renderHook(() => useOrderFilters(mockOrders));

    expect(result.current.filters).toEqual({
      customerName: '',
      customerId: '',
      orderFrom: '',
      orderId: '',
      confirmationStatus: '',
      paymentStatus: '',
    });
  });

  it('should filter by customer name', () => {
    const { result } = renderHook(() => useOrderFilters(mockOrders));

    act(() => {
      result.current.handleFilterChange('customerName', 'john doe');
    });

    expect(result.current.filteredOrders).toHaveLength(1);
    expect(result.current.filteredOrders[0].customerName).toBe('John Doe');
  });

  it('should filter by customer ID', () => {
    const { result } = renderHook(() => useOrderFilters(mockOrders));

    act(() => {
      result.current.handleFilterChange('customerId', 'c456');
    });

    expect(result.current.filteredOrders).toHaveLength(1);
    expect(result.current.filteredOrders[0].customerId).toBe('C456');
  });

  it('should filter by order source', () => {
    const { result } = renderHook(() => useOrderFilters(mockOrders));

    act(() => {
      result.current.handleFilterChange('orderFrom', 'instagram');
    });

    expect(result.current.filteredOrders).toHaveLength(1);
    expect(result.current.filteredOrders[0].orderFrom).toBe('instagram');
  });

  it('should filter by payment status', () => {
    const { result } = renderHook(() => useOrderFilters(mockOrders));

    act(() => {
      result.current.handleFilterChange('paymentStatus', 'paid');
    });

    expect(result.current.filteredOrders).toHaveLength(1);
    expect(result.current.filteredOrders[0].paymentStatus).toBe('paid');
  });

  it('should apply multiple filters', () => {
    const { result } = renderHook(() => useOrderFilters(mockOrders));

    act(() => {
      result.current.handleFilterChange('confirmationStatus', 'confirmed');
      result.current.handleFilterChange('orderFrom', 'instagram');
    });

    expect(result.current.filteredOrders).toHaveLength(1);
    expect(result.current.filteredOrders[0].orderId).toBe('ORD-001');
  });

  it('should clear all filters', () => {
    const { result } = renderHook(() => useOrderFilters(mockOrders));

    act(() => {
      result.current.handleFilterChange('customerName', 'john');
      result.current.handleFilterChange('paymentStatus', 'paid');
    });

    expect(result.current.filteredOrders).toHaveLength(1);

    act(() => {
      result.current.handleClearFilters();
    });

    expect(result.current.filteredOrders).toHaveLength(3);
    expect(result.current.filters.customerName).toBe('');
  });

  it('should sort orders by price ascending', () => {
    const { result } = renderHook(() => useOrderFilters(mockOrders));

    act(() => {
      result.current.handleSort('totalPrice');
    });

    expect(result.current.sortedOrders[0].totalPrice).toBe(100);
    expect(result.current.sortedOrders[2].totalPrice).toBe(200);
  });

  it('should sort orders by price descending', () => {
    const { result } = renderHook(() => useOrderFilters(mockOrders));

    act(() => {
      result.current.handleSort('totalPrice');
      result.current.handleSort('totalPrice');
    });

    expect(result.current.sortedOrders[0].totalPrice).toBe(200);
    expect(result.current.sortedOrders[2].totalPrice).toBe(100);
  });

  it('should sort orders by expected delivery date', () => {
    const { result } = renderHook(() => useOrderFilters(mockOrders));

    // Default is already sorted by expectedDeliveryDate ASC, null dates are last
    expect(result.current.sortedOrders[0].expectedDeliveryDate).toBe('2024-01-10');
    expect(result.current.sortedOrders[1].expectedDeliveryDate).toBe('2024-01-15');
    expect(result.current.sortedOrders[2].expectedDeliveryDate).toBeNull();

    // Sort again to toggle to descending
    act(() => {
      result.current.handleSort('expectedDeliveryDate');
    });

    // In descending order, null dates should come first
    expect(result.current.sortedOrders[0].expectedDeliveryDate).toBeNull();
    expect(result.current.sortedOrders[1].expectedDeliveryDate).toBe('2024-01-15');
    expect(result.current.sortedOrders[2].expectedDeliveryDate).toBe('2024-01-10');
  });

  it('should sort orders by customer name', () => {
    const { result } = renderHook(() => useOrderFilters(mockOrders));

    act(() => {
      result.current.handleSort('customerName');
    });

    expect(result.current.sortedOrders[0].customerName).toBe('Bob Johnson');
    expect(result.current.sortedOrders[2].customerName).toBe('John Doe');
  });

  it('should toggle sort direction', () => {
    const { result } = renderHook(() => useOrderFilters(mockOrders));

    act(() => {
      result.current.handleSort('customerName');
    });

    expect(result.current.sortConfig.direction).toBe('asc');

    act(() => {
      result.current.handleSort('customerName');
    });

    expect(result.current.sortConfig.direction).toBe('desc');
  });

  it('should return all orders when no filters applied', () => {
    const { result } = renderHook(() => useOrderFilters(mockOrders));

    expect(result.current.filteredOrders).toHaveLength(3);
    expect(result.current.sortedOrders).toHaveLength(3);
  });

  it('should handle empty orders array', () => {
    const { result } = renderHook(() => useOrderFilters([]));

    expect(result.current.filteredOrders).toHaveLength(0);
    expect(result.current.sortedOrders).toHaveLength(0);
  });
});
