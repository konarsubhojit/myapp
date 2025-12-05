import { useState, useMemo, useEffect, useCallback } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import { getOrdersPaginated } from '../services/api';
import OrderDetails from './OrderDetails';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function OrderHistory() {
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [filters, setFilters] = useState({
    customerName: '',
    customerId: '',
    orderFrom: '',
    orderId: '',
  });
  const [sortConfig, setSortConfig] = useState({ key: 'expectedDeliveryDate', direction: 'asc' });

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

  const getPriorityStatus = (expectedDeliveryDate) => {
    if (!expectedDeliveryDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deliveryDate = new Date(expectedDeliveryDate);
    deliveryDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { status: 'overdue', label: 'Overdue', className: 'priority-overdue' };
    } else if (diffDays === 0) {
      return { status: 'due-today', label: 'Due Today', className: 'priority-due-today' };
    } else if (diffDays <= 3) {
      return { status: 'urgent', label: `${diffDays}d`, className: 'priority-urgent' };
    }
    return null;
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
      
      return matchesCustomerName && matchesCustomerId && matchesOrderFrom && matchesOrderId;
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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

  const orderSources = ['instagram', 'facebook', 'whatsapp', 'call', 'offline'];

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
            {orderSources.map(source => (
              <option key={source} value={source}>
                {source.charAt(0).toUpperCase() + source.slice(1)}
              </option>
            ))}
          </select>
          <button 
            className="clear-filters-btn"
            onClick={() => setFilters({ customerName: '', customerId: '', orderFrom: '', orderId: '' })}
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
                <th onClick={() => handleSort('customerId')} className="sortable">
                  Customer ID {getSortIcon('customerId')}
                </th>
                <th onClick={() => handleSort('orderFrom')} className="sortable">
                  Source {getSortIcon('orderFrom')}
                </th>
                <th>Items</th>
                <th onClick={() => handleSort('totalPrice')} className="sortable">
                  Total {getSortIcon('totalPrice')}
                </th>
                <th onClick={() => handleSort('expectedDeliveryDate')} className="sortable">
                  Delivery {getSortIcon('expectedDeliveryDate')}
                </th>
                <th onClick={() => handleSort('createdAt')} className="sortable">
                  Created {getSortIcon('createdAt')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.map(order => {
                const priority = getPriorityStatus(order.expectedDeliveryDate);
                return (
                  <tr 
                    key={order._id} 
                    onClick={() => handleOrderClick(order._id)}
                    className={`order-row clickable ${priority ? priority.className : ''}`}
                  >
                    <td className="order-id-cell">{order.orderId}</td>
                    <td>{order.customerName}</td>
                    <td>{order.customerId}</td>
                    <td>
                      <span className="source-badge">
                        {order.orderFrom}
                      </span>
                    </td>
                    <td className="items-cell">
                      <ul className="items-list-compact">
                        {order.items.map((item, idx) => (
                          <li key={idx}>
                            {item.name} × {item.quantity}
                            {item.customizationRequest && (
                              <span className="customization-note"> ({item.customizationRequest})</span>
                            )}
                          </li>
                        ))}
                      </ul>
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
                    <td className="date-cell">{formatDate(order.createdAt)}</td>
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
        <OrderDetails orderId={selectedOrderId} onClose={handleCloseDetails} />
      )}
    </div>
  );
}

export default OrderHistory;
