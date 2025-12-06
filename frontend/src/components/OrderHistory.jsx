import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCurrency } from '../contexts/CurrencyContext';
import { getOrdersPaginated } from '../services/api';
import { getPriorityStatus } from '../utils/priorityUtils';
import OrderDetails from './OrderDetails';
import {
  ORDER_SOURCES,
  PAYMENT_STATUSES,
  CONFIRMATION_STATUSES,
  getPaymentStatusLabel,
  getConfirmationStatusLabel,
} from '../constants/orderConstants';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

// Build URL params string for comparison
const buildParamsString = (filters, pagination, sortConfig, selectedOrderId) => {
  const parts = [];
  if (pagination.page > 1) parts.push(`page=${pagination.page}`);
  if (pagination.limit !== 10) parts.push(`limit=${pagination.limit}`);
  if (filters.customerName) parts.push(`customerName=${filters.customerName}`);
  if (filters.customerId) parts.push(`customerId=${filters.customerId}`);
  if (filters.orderFrom) parts.push(`orderFrom=${filters.orderFrom}`);
  if (filters.orderId) parts.push(`orderId=${filters.orderId}`);
  if (filters.confirmationStatus) parts.push(`confirmationStatus=${filters.confirmationStatus}`);
  if (filters.paymentStatus) parts.push(`paymentStatus=${filters.paymentStatus}`);
  if (sortConfig.key !== 'expectedDeliveryDate') parts.push(`sortKey=${sortConfig.key}`);
  if (sortConfig.direction !== 'asc') parts.push(`sortDir=${sortConfig.direction}`);
  if (selectedOrderId) parts.push(`order=${selectedOrderId}`);
  return parts.join('&');
};

// Parse URL params to state
const parseUrlParams = (searchParams) => {
  const page = parseInt(searchParams.get('page'), 10);
  const limit = parseInt(searchParams.get('limit'), 10);
  const sortKey = searchParams.get('sortKey');
  const sortDir = searchParams.get('sortDir');
  
  return {
    page: Number.isNaN(page) || page < 1 ? 1 : page,
    limit: PAGE_SIZE_OPTIONS.includes(limit) ? limit : 10,
    filters: {
      customerName: searchParams.get('customerName') || '',
      customerId: searchParams.get('customerId') || '',
      orderFrom: searchParams.get('orderFrom') || '',
      orderId: searchParams.get('orderId') || '',
      confirmationStatus: searchParams.get('confirmationStatus') || '',
      paymentStatus: searchParams.get('paymentStatus') || '',
    },
    sortConfig: {
      key: sortKey || 'expectedDeliveryDate',
      direction: sortDir === 'desc' ? 'desc' : 'asc',
    },
    selectedOrderId: searchParams.get('order') || null,
  };
};

function OrderHistory({ onDuplicateOrder }) {
  const { formatPrice } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Parse initial state from URL
  const initialState = parseUrlParams(searchParams);
  
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ 
    page: initialState.page, 
    limit: initialState.limit, 
    total: 0, 
    totalPages: 0 
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(initialState.selectedOrderId);
  const [filters, setFilters] = useState(initialState.filters);
  const [sortConfig, setSortConfig] = useState(initialState.sortConfig);
  
  // Track previous URL params to avoid unnecessary updates
  const prevParamsRef = useRef('');

  // Update URL when state changes
  const updateUrl = useCallback((newFilters, newPagination, newSortConfig, newSelectedOrderId) => {
    const params = new URLSearchParams();
    
    // Only add non-default values to URL
    if (newPagination.page > 1) params.set('page', newPagination.page);
    if (newPagination.limit !== 10) params.set('limit', newPagination.limit);
    
    if (newFilters.customerName) params.set('customerName', newFilters.customerName);
    if (newFilters.customerId) params.set('customerId', newFilters.customerId);
    if (newFilters.orderFrom) params.set('orderFrom', newFilters.orderFrom);
    if (newFilters.orderId) params.set('orderId', newFilters.orderId);
    if (newFilters.confirmationStatus) params.set('confirmationStatus', newFilters.confirmationStatus);
    if (newFilters.paymentStatus) params.set('paymentStatus', newFilters.paymentStatus);
    
    if (newSortConfig.key !== 'expectedDeliveryDate') params.set('sortKey', newSortConfig.key);
    if (newSortConfig.direction !== 'asc') params.set('sortDir', newSortConfig.direction);
    
    if (newSelectedOrderId) params.set('order', newSelectedOrderId);
    
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  const fetchOrders = useCallback(async (page, limit) => {
    setLoading(true);
    setError('');
    try {
      const result = await getOrdersPaginated({ page, limit });
      setOrders(result.orders);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(pagination.page, pagination.limit);
  }, [pagination.page, pagination.limit, fetchOrders]);

  // Update URL when state changes - only if params actually changed
  useEffect(() => {
    const paginationForUrl = { page: pagination.page, limit: pagination.limit };
    const newParamsString = buildParamsString(filters, paginationForUrl, sortConfig, selectedOrderId);
    
    // Only update URL if params actually changed
    if (newParamsString !== prevParamsRef.current) {
      prevParamsRef.current = newParamsString;
      updateUrl(filters, paginationForUrl, sortConfig, selectedOrderId);
    }
  }, [filters, pagination.page, pagination.limit, sortConfig, selectedOrderId, updateUrl]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handlePageSizeChange = (newLimit) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  const handleOrderClick = (orderId) => {
    setSelectedOrderId(orderId);
  };

  const handleCloseDetails = () => {
    setSelectedOrderId(null);
  };

  const handleClearFilters = () => {
    const clearedFilters = { 
      customerName: '', 
      customerId: '', 
      orderFrom: '', 
      orderId: '', 
      confirmationStatus: '', 
      paymentStatus: '' 
    };
    setFilters(clearedFilters);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesCustomerName = order.customerName
        .toLowerCase()
        .includes(filters.customerName.toLowerCase());
      const matchesCustomerId = order.customerId
        .toLowerCase()
        .includes(filters.customerId.toLowerCase());
      const matchesOrderFrom = !filters.orderFrom || order.orderFrom === filters.orderFrom;
      const matchesOrderId = order.orderId
        .toLowerCase()
        .includes(filters.orderId.toLowerCase());
      const matchesConfirmationStatus = !filters.confirmationStatus || order.confirmationStatus === filters.confirmationStatus;
      const matchesPaymentStatus = !filters.paymentStatus || order.paymentStatus === filters.paymentStatus;
      
      return matchesCustomerName && matchesCustomerId && matchesOrderFrom && matchesOrderId && matchesConfirmationStatus && matchesPaymentStatus;
    });
  }, [orders, filters]);

  const sortedOrders = useMemo(() => {
    const sorted = [...filteredOrders];
    sorted.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (sortConfig.key === 'totalPrice') {
        aValue = parseFloat(aValue);
        bValue = parseFloat(bValue);
      } else if (sortConfig.key === 'createdAt' || sortConfig.key === 'expectedDeliveryDate') {
        // Handle null values - nulls go last for ascending, first for descending
        if (!aValue && !bValue) return 0;
        if (!aValue) return sortConfig.direction === 'asc' ? 1 : -1;
        if (!bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredOrders, sortConfig]);

  const formatDeliveryDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  if (initialLoading) {
    return (
      <div className="panel order-history-panel">
        <h2>Order History</h2>
        <p className="loading-text">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="panel order-history-panel">
      <h2>Order History</h2>
      
      {error && <p className="error">{error}</p>}
      
      {/* Priority Legend */}
      <div className="priority-legend">
        <span className="legend-title">Priority Indicators:</span>
        <div className="legend-items">
          <span className="legend-item">
            <span className="legend-badge priority-overdue">Overdue</span>
            <span className="legend-desc">Past delivery date</span>
          </span>
          <span className="legend-item">
            <span className="legend-badge priority-due-today">Due Today</span>
            <span className="legend-desc">Deliver today</span>
          </span>
          <span className="legend-item">
            <span className="legend-badge priority-urgent">1-3d</span>
            <span className="legend-desc">Due within 3 days</span>
          </span>
          <span className="legend-item">
            <span className="legend-badge priority-normal">Normal</span>
            <span className="legend-desc">Due later</span>
          </span>
        </div>
      </div>
      
      <div className="filters-section">
        <h4>Filters</h4>
        <div className="filters-row">
          <input
            type="text"
            placeholder="Filter by Order ID"
            value={filters.orderId}
            onChange={(e) => handleFilterChange('orderId', e.target.value)}
          />
          <input
            type="text"
            placeholder="Filter by Customer Name"
            value={filters.customerName}
            onChange={(e) => handleFilterChange('customerName', e.target.value)}
          />
          <input
            type="text"
            placeholder="Filter by Customer ID"
            value={filters.customerId}
            onChange={(e) => handleFilterChange('customerId', e.target.value)}
          />
          <select
            value={filters.orderFrom}
            onChange={(e) => handleFilterChange('orderFrom', e.target.value)}
          >
            <option value="">All Sources</option>
            {ORDER_SOURCES.map(source => (
              <option key={source.value} value={source.value}>
                {source.label}
              </option>
            ))}
          </select>
          <select
            value={filters.confirmationStatus}
            onChange={(e) => handleFilterChange('confirmationStatus', e.target.value)}
          >
            <option value="">All Confirmations</option>
            {CONFIRMATION_STATUSES.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <select
            value={filters.paymentStatus}
            onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
          >
            <option value="">All Payments</option>
            {PAYMENT_STATUSES.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <button 
            className="clear-filters-btn"
            onClick={handleClearFilters}
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="pagination-controls">
        <div className="page-size-selector">
          <label htmlFor="pageSize">Items per page:</label>
          <select
            id="pageSize"
            value={pagination.limit}
            onChange={(e) => handlePageSizeChange(parseInt(e.target.value, 10))}
          >
            {PAGE_SIZE_OPTIONS.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p className="loading-text">Loading...</p>}

      {!loading && sortedOrders.length === 0 ? (
        <p className="no-orders">No orders found</p>
      ) : (
        <div className="orders-table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('orderId')} className="sortable">
                  Order ID {getSortIcon('orderId')}
                </th>
                <th onClick={() => handleSort('customerName')} className="sortable">
                  Customer {getSortIcon('customerName')}
                </th>
                <th onClick={() => handleSort('orderFrom')} className="sortable">
                  Source {getSortIcon('orderFrom')}
                </th>
                <th onClick={() => handleSort('confirmationStatus')} className="sortable">
                  Confirmation {getSortIcon('confirmationStatus')}
                </th>
                <th onClick={() => handleSort('status')} className="sortable">
                  Status {getSortIcon('status')}
                </th>
                <th onClick={() => handleSort('paymentStatus')} className="sortable">
                  Payment {getSortIcon('paymentStatus')}
                </th>
                <th onClick={() => handleSort('totalPrice')} className="sortable">
                  Total {getSortIcon('totalPrice')}
                </th>
                <th onClick={() => handleSort('expectedDeliveryDate')} className="sortable">
                  Delivery {getSortIcon('expectedDeliveryDate')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.map(order => {
                const priority = getPriorityStatus(order.expectedDeliveryDate, { shortLabels: true });
                const getStatusClass = (status) => {
                  switch (status) {
                    case 'pending': return 'status-pending';
                    case 'processing': return 'status-processing';
                    case 'completed': return 'status-completed';
                    case 'cancelled': return 'status-cancelled';
                    default: return 'status-pending';
                  }
                };
                return (
                  <tr 
                    key={order._id} 
                    onClick={() => handleOrderClick(order._id)}
                    className={`order-row clickable ${priority ? priority.className : ''}`}
                  >
                    <td className="order-id-cell">{order.orderId}</td>
                    <td>
                      <div>{order.customerName}</div>
                      <div className="customer-id-small">{order.customerId}</div>
                    </td>
                    <td>
                      <span className="source-badge">
                        {order.orderFrom}
                      </span>
                    </td>
                    <td className="confirmation-cell">
                      <span className={`confirmation-badge confirmation-${order.confirmationStatus || 'unconfirmed'}`}>
                        {getConfirmationStatusLabel(order.confirmationStatus)}
                      </span>
                    </td>
                    <td className="status-cell">
                      <span className={`status-badge ${getStatusClass(order.status)}`}>
                        {order.status || 'pending'}
                      </span>
                    </td>
                    <td className="payment-cell">
                      <span className={`payment-badge payment-${order.paymentStatus || 'unpaid'}`}>
                        {getPaymentStatusLabel(order.paymentStatus)}
                      </span>
                    </td>
                    <td className="total-cell">{formatPrice(order.totalPrice)}</td>
                    <td className="delivery-cell">
                      <span className="delivery-date">
                        {formatDeliveryDate(order.expectedDeliveryDate)}
                      </span>
                      {priority && (
                        <span className={`priority-badge-small ${priority.className}`}>
                          {priority.label}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="pagination-footer">
        <div className="pagination-info">
          Showing {sortedOrders.length} of {pagination.total} orders (Page {pagination.page} of {pagination.totalPages})
        </div>
        <div className="pagination-buttons">
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(1)}
            disabled={pagination.page === 1}
          >
            First
          </button>
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            Previous
          </button>
          <span className="page-indicator">Page {pagination.page}</span>
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
          >
            Next
          </button>
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(pagination.totalPages)}
            disabled={pagination.page === pagination.totalPages}
          >
            Last
          </button>
        </div>
      </div>

      {selectedOrderId && (
        <OrderDetails 
          orderId={selectedOrderId} 
          onClose={handleCloseDetails}
          onOrderUpdated={() => fetchOrders(pagination.page, pagination.limit)}
          onDuplicateOrder={onDuplicateOrder}
        />
      )}
    </div>
  );
}

export default OrderHistory;
