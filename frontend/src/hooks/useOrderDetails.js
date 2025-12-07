import { useState, useEffect, useCallback } from 'react';
import { getOrder, updateOrder } from '../services/api';

/**
 * Creates initial edit form state from order data
 */
const createEditFormFromOrder = (data) => ({
  customerName: data.customerName || '',
  customerId: data.customerId || '',
  orderFrom: data.orderFrom || '',
  expectedDeliveryDate: data.expectedDeliveryDate ? data.expectedDeliveryDate.split('T')[0] : '',
  status: data.status || 'pending',
  paymentStatus: data.paymentStatus || 'unpaid',
  paidAmount: data.paidAmount || 0,
  confirmationStatus: data.confirmationStatus || 'unconfirmed',
  customerNotes: data.customerNotes || '',
  priority: data.priority || 0
});

/**
 * Validates order form data
 */
const validateFormData = (editForm, totalPrice) => {
  if (!editForm.customerName.trim() || !editForm.customerId.trim()) {
    return { valid: false, error: 'Customer name and ID are required' };
  }

  const parsedPaidAmount = Number.parseFloat(editForm.paidAmount);
  if (Number.isNaN(parsedPaidAmount) || parsedPaidAmount < 0) {
    return { valid: false, error: 'Paid amount must be a valid non-negative number' };
  }

  if (parsedPaidAmount > totalPrice) {
    return { valid: false, error: 'Paid amount cannot exceed total price' };
  }

  if (
    editForm.paymentStatus === 'partially_paid' &&
    (parsedPaidAmount <= 0 || parsedPaidAmount >= totalPrice)
  ) {
    return { valid: false, error: 'For partially paid orders, paid amount must be greater than 0 and less than total price' };
  }

  return { valid: true, parsedPaidAmount };
};

/**
 * Custom hook for managing order details, fetching, and editing
 * @param {string} orderId - The order ID to fetch and manage
 * @param {Function} showSuccess - Success notification callback
 * @param {Function} showError - Error notification callback
 * @param {Function} onOrderUpdated - Callback when order is successfully updated
 * @returns {Object} - Order data, edit state, and handlers
 */
export const useOrderDetails = (orderId, showSuccess, showError, onOrderUpdated) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    customerName: '',
    customerId: '',
    orderFrom: '',
    expectedDeliveryDate: '',
    status: '',
    paymentStatus: '',
    paidAmount: '',
    confirmationStatus: '',
    customerNotes: '',
    priority: 0
  });

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getOrder(orderId);
      setOrder(data);
      setEditForm(createEditFormFromOrder(data));
    } catch (err) {
      setError(err.message || 'Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId, fetchOrder]);

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const validation = validateFormData(editForm, order.totalPrice);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updateData = {
        customerName: editForm.customerName.trim(),
        customerId: editForm.customerId.trim(),
        orderFrom: editForm.orderFrom,
        status: editForm.status,
        expectedDeliveryDate: editForm.expectedDeliveryDate || null,
        paymentStatus: editForm.paymentStatus,
        paidAmount: validation.parsedPaidAmount,
        confirmationStatus: editForm.confirmationStatus,
        customerNotes: editForm.customerNotes,
        priority: Number.parseInt(editForm.priority, 10)
      };

      const updatedOrder = await updateOrder(orderId, updateData);
      setOrder(updatedOrder);
      setIsEditing(false);
      if (onOrderUpdated) onOrderUpdated();
      showSuccess(`Order ${updatedOrder.orderId} updated successfully!`);
    } catch (err) {
      setError(err.message || 'Failed to update order');
      showError(err.message || 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError('');
    if (order) {
      setEditForm(createEditFormFromOrder(order));
    }
  };

  const startEditing = () => {
    setIsEditing(true);
  };

  return {
    order,
    loading,
    saving,
    error,
    isEditing,
    editForm,
    setError,
    handleEditChange,
    handleSave,
    handleCancelEdit,
    startEditing,
  };
};
