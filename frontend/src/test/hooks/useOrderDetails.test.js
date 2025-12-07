import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { useOrderDetails } from '../../hooks/useOrderDetails';
import * as api from '../../services/api';

vi.mock('../../services/api');

describe('useOrderDetails', () => {
  const mockOrderId = 'order-123';
  const mockShowSuccess = vi.fn();
  const mockShowError = vi.fn();
  const mockOnOrderUpdated = vi.fn();

  const mockOrder = {
    _id: mockOrderId,
    orderId: 'ORD-001',
    customerName: 'John Doe',
    customerId: 'C123',
    address: '123 Main St',
    orderFrom: 'instagram',
    orderDate: '2024-01-01T00:00:00Z',
    expectedDeliveryDate: '2024-01-15T00:00:00Z',
    status: 'pending',
    paymentStatus: 'unpaid',
    paidAmount: 0,
    confirmationStatus: 'unconfirmed',
    customerNotes: 'Test notes',
    priority: 0,
    totalPrice: 100,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch order on mount', async () => {
    api.getOrder.mockResolvedValue(mockOrder);

    const { result } = renderHook(() =>
      useOrderDetails(mockOrderId, mockShowSuccess, mockShowError, mockOnOrderUpdated)
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(api.getOrder).toHaveBeenCalledWith(mockOrderId);
    expect(result.current.order).toEqual(mockOrder);
    expect(result.current.error).toBe('');
  });

  it('should handle fetch error', async () => {
    api.getOrder.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useOrderDetails(mockOrderId, mockShowSuccess, mockShowError, mockOnOrderUpdated)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.order).toBeNull();
  });

  it('should initialize edit form from order data', async () => {
    api.getOrder.mockResolvedValue(mockOrder);

    const { result } = renderHook(() =>
      useOrderDetails(mockOrderId, mockShowSuccess, mockShowError, mockOnOrderUpdated)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.editForm.customerName).toBe('John Doe');
    expect(result.current.editForm.customerId).toBe('C123');
    expect(result.current.editForm.address).toBe('123 Main St');
  });

  it('should start editing mode', async () => {
    api.getOrder.mockResolvedValue(mockOrder);

    const { result } = renderHook(() =>
      useOrderDetails(mockOrderId, mockShowSuccess, mockShowError, mockOnOrderUpdated)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isEditing).toBe(false);

    act(() => {
      result.current.startEditing();
    });

    expect(result.current.isEditing).toBe(true);
  });

  it('should handle edit form changes', async () => {
    api.getOrder.mockResolvedValue(mockOrder);

    const { result } = renderHook(() =>
      useOrderDetails(mockOrderId, mockShowSuccess, mockShowError, mockOnOrderUpdated)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.handleEditChange('customerName', 'Jane Smith');
    });

    expect(result.current.editForm.customerName).toBe('Jane Smith');
  });

  it('should save updated order', async () => {
    const updatedOrder = { ...mockOrder, customerName: 'Jane Smith' };
    api.getOrder.mockResolvedValue(mockOrder);
    api.updateOrder.mockResolvedValue(updatedOrder);

    const { result } = renderHook(() =>
      useOrderDetails(mockOrderId, mockShowSuccess, mockShowError, mockOnOrderUpdated)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.startEditing();
      result.current.handleEditChange('customerName', 'Jane Smith');
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(api.updateOrder).toHaveBeenCalledWith(mockOrderId, expect.objectContaining({
      customerName: 'Jane Smith',
    }));
    expect(mockShowSuccess).toHaveBeenCalled();
    expect(mockOnOrderUpdated).toHaveBeenCalled();
    expect(result.current.isEditing).toBe(false);
  });

  it('should validate customer name is required', async () => {
    api.getOrder.mockResolvedValue(mockOrder);

    const { result } = renderHook(() =>
      useOrderDetails(mockOrderId, mockShowSuccess, mockShowError, mockOnOrderUpdated)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.startEditing();
      result.current.handleEditChange('customerName', '   ');
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.error).toBe('Customer name and ID are required');
    expect(api.updateOrder).not.toHaveBeenCalled();
  });

  it('should validate paid amount does not exceed total price', async () => {
    api.getOrder.mockResolvedValue(mockOrder);

    const { result } = renderHook(() =>
      useOrderDetails(mockOrderId, mockShowSuccess, mockShowError, mockOnOrderUpdated)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.startEditing();
      result.current.handleEditChange('paidAmount', 150);
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.error).toBe('Paid amount cannot exceed total price');
    expect(api.updateOrder).not.toHaveBeenCalled();
  });

  it('should validate partially paid amount', async () => {
    api.getOrder.mockResolvedValue(mockOrder);

    const { result } = renderHook(() =>
      useOrderDetails(mockOrderId, mockShowSuccess, mockShowError, mockOnOrderUpdated)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.startEditing();
      result.current.handleEditChange('paymentStatus', 'partially_paid');
      result.current.handleEditChange('paidAmount', 0);
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.error).toContain('For partially paid orders');
    expect(api.updateOrder).not.toHaveBeenCalled();
  });

  it('should cancel editing', async () => {
    api.getOrder.mockResolvedValue(mockOrder);

    const { result } = renderHook(() =>
      useOrderDetails(mockOrderId, mockShowSuccess, mockShowError, mockOnOrderUpdated)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.startEditing();
      result.current.handleEditChange('customerName', 'Changed Name');
    });

    act(() => {
      result.current.handleCancelEdit();
    });

    expect(result.current.isEditing).toBe(false);
    expect(result.current.editForm.customerName).toBe('John Doe');
  });

  it('should handle save error', async () => {
    api.getOrder.mockResolvedValue(mockOrder);
    api.updateOrder.mockRejectedValue(new Error('Update failed'));

    const { result } = renderHook(() =>
      useOrderDetails(mockOrderId, mockShowSuccess, mockShowError, mockOnOrderUpdated)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.startEditing();
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.error).toBe('Update failed');
    expect(mockShowError).toHaveBeenCalledWith('Update failed');
  });
});
