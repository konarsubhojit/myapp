import { useState, useMemo } from 'react';

/**
 * Creates an empty filter object with default values
 */
const createEmptyFilters = () => ({
  customerName: '',
  customerId: '',
  orderFrom: '',
  orderId: '',
  confirmationStatus: '',
  paymentStatus: ''
});

/**
 * Checks if an order matches the given filter criteria
 * @param {Object} order - The order object to check
 * @param {Object} filters - The filter criteria object
 * @returns {boolean} - True if order matches all filters, false otherwise
 */
const orderMatchesFilters = (order, filters) => {
  if (!filters) return true;
  
  const matchesCustomerName = (order.customerName || '')
    .toLowerCase()
    .includes((filters.customerName || '').toLowerCase());
  const matchesCustomerId = (order.customerId || '')
    .toLowerCase()
    .includes((filters.customerId || '').toLowerCase());
  const matchesOrderFrom = !filters.orderFrom || order.orderFrom === filters.orderFrom;
  const matchesOrderId = (order.orderId || '')
    .toLowerCase()
    .includes((filters.orderId || '').toLowerCase());
  const matchesConfirmationStatus = !filters.confirmationStatus || order.confirmationStatus === filters.confirmationStatus;
  const matchesPaymentStatus = !filters.paymentStatus || order.paymentStatus === filters.paymentStatus;
  
  return matchesCustomerName && matchesCustomerId && matchesOrderFrom && matchesOrderId && matchesConfirmationStatus && matchesPaymentStatus;
};

/**
 * Handles null value comparison for date sorting
 */
const handleNullDateComparison = (aValue, bValue, sortDirection) => {
  if (!aValue && !bValue) return 0;
  if (!aValue) return sortDirection === 'asc' ? 1 : -1;
  if (!bValue) return sortDirection === 'asc' ? -1 : 1;
  return null;
};

/**
 * Normalizes values based on sort key type
 */
const normalizeComparisonValues = (aValue, bValue, sortKey, sortDirection) => {
  if (sortKey === 'totalPrice') {
    const a = Number.parseFloat(aValue);
    const b = Number.parseFloat(bValue);
    // Handle NaN values
    if (Number.isNaN(a) && Number.isNaN(b)) return { a: 0, b: 0 };
    if (Number.isNaN(a)) return { earlyReturn: sortDirection === 'asc' ? 1 : -1 };
    if (Number.isNaN(b)) return { earlyReturn: sortDirection === 'asc' ? -1 : 1 };
    return { a, b };
  }
  
  if (sortKey === 'createdAt' || sortKey === 'expectedDeliveryDate') {
    const nullResult = handleNullDateComparison(aValue, bValue, sortDirection);
    if (nullResult !== null) return { earlyReturn: nullResult };
    return { a: new Date(aValue), b: new Date(bValue) };
  }
  
  return { 
    a: aValue != null ? String(aValue).toLowerCase() : '', 
    b: bValue != null ? String(bValue).toLowerCase() : '' 
  };
};

/**
 * Compares two order values for sorting
 */
const compareOrderValues = (aValue, bValue, sortKey, sortDirection) => {
  const normalized = normalizeComparisonValues(aValue, bValue, sortKey, sortDirection);
  if (normalized.earlyReturn !== undefined) return normalized.earlyReturn;

  const { a, b } = normalized;
  if (a < b) return sortDirection === 'asc' ? -1 : 1;
  if (a > b) return sortDirection === 'asc' ? 1 : -1;
  return 0;
};

/**
 * Custom hook for managing order filtering and sorting
 * @param {Array} orders - Array of orders to filter and sort
 * @param {Object} initialFilters - Initial filter state
 * @param {Object} initialSortConfig - Initial sort configuration
 * @returns {Object} - Filters, sorting state and handlers
 */
export const useOrderFilters = (orders, initialFilters = {}, initialSortConfig = {}) => {
  const [filters, setFilters] = useState({
    ...createEmptyFilters(),
    ...initialFilters
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'expectedDeliveryDate',
    direction: 'asc',
    ...initialSortConfig
  });

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleClearFilters = () => {
    setFilters(createEmptyFilters());
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => orderMatchesFilters(order, filters));
  }, [orders, filters]);

  const sortedOrders = useMemo(() => {
    const sorted = [...filteredOrders];
    sorted.sort((a, b) => compareOrderValues(
      a[sortConfig.key],
      b[sortConfig.key],
      sortConfig.key,
      sortConfig.direction
    ));
    return sorted;
  }, [filteredOrders, sortConfig]);

  return {
    filters,
    sortConfig,
    filteredOrders,
    sortedOrders,
    handleFilterChange,
    handleClearFilters,
    handleSort,
  };
};
