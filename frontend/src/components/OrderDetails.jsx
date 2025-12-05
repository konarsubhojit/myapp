import { useState, useEffect } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import { getOrder, updateOrder } from '../services/api';
import { getPriorityStatus } from '../utils/priorityUtils';

const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ORDER_SOURCES = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'call', label: 'Call' },
  { value: 'offline', label: 'Offline' },
];

const PAYMENT_STATUSES = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'cash_on_delivery', label: 'Cash on Delivery' },
  { value: 'refunded', label: 'Refunded' },
];

const CONFIRMATION_STATUSES = [
  { value: 'unconfirmed', label: 'Unconfirmed' },
  { value: 'pending_confirmation', label: 'Pending Confirmation' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_LEVELS = [
  { value: 0, label: 'Normal' },
  { value: 1, label: 'Low Priority' },
  { value: 2, label: 'Medium Priority' },
  { value: 3, label: 'High Priority' },
  { value: 4, label: 'Urgent' },
  { value: 5, label: 'Critical' },
];

function OrderDetails({ orderId, onClose, onOrderUpdated }) {
  const { formatPrice } = useCurrency();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit form state
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

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getOrder(orderId);
        setOrder(data);
        setEditForm({
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
      } catch (err) {
        setError(err.message || 'Failed to fetch order details');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDeliveryDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!editForm.customerName.trim() || !editForm.customerId.trim()) {
      setError('Customer name and ID are required');
      return;
    }

    // Validate paid amount
    const parsedPaidAmount = parseFloat(editForm.paidAmount);
    if (isNaN(parsedPaidAmount) || parsedPaidAmount < 0) {
      setError('Paid amount must be a valid non-negative number');
      return;
    }

    if (parsedPaidAmount > order.totalPrice) {
      setError('Paid amount cannot exceed total price');
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
        paidAmount: parsedPaidAmount,
        confirmationStatus: editForm.confirmationStatus,
        customerNotes: editForm.customerNotes,
        priority: parseInt(editForm.priority, 10)
      };

      const updatedOrder = await updateOrder(orderId, updateData);
      setOrder(updatedOrder);
      setIsEditing(false);
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      setError(err.message || 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError('');
    // Reset form to current order values
    if (order) {
      setEditForm({
        customerName: order.customerName || '',
        customerId: order.customerId || '',
        orderFrom: order.orderFrom || '',
        expectedDeliveryDate: order.expectedDeliveryDate ? order.expectedDeliveryDate.split('T')[0] : '',
        status: order.status || 'pending',
        paymentStatus: order.paymentStatus || 'unpaid',
        paidAmount: order.paidAmount || 0,
        confirmationStatus: order.confirmationStatus || 'unconfirmed',
        customerNotes: order.customerNotes || '',
        priority: order.priority || 0
      });
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'processing': return 'status-processing';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-pending';
    }
  };

  if (loading) {
    return (
      <div className="order-details-overlay">
        <div className="order-details-modal">
          <p className="loading-text">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="order-details-overlay">
        <div className="order-details-modal">
          <div className="order-details-header">
            <h2>Error</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <p className="error">{error}</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const priority = getPriorityStatus(order.expectedDeliveryDate);

  return (
    <div className="order-details-overlay" onClick={onClose}>
      <div className="order-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="order-details-header">
          <div className="order-details-title">
            <h2>Order {order.orderId}</h2>
            <div className="order-badges">
              {priority && (
                <span className={`priority-badge ${priority.className}`}>
                  {priority.label}
                </span>
              )}
              <span className={`status-badge ${getStatusClass(order.status)}`}>
                {order.status || 'Pending'}
              </span>
            </div>
          </div>
          <div className="order-header-actions">
            {!isEditing && (
              <button className="edit-btn" onClick={() => setIsEditing(true)}>
                Edit
              </button>
            )}
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="order-details-content">
          {error && <p className="error">{error}</p>}

          {isEditing ? (
            <>
              <div className="order-details-section">
                <h3>Customer Information</h3>
                <div className="form-group">
                  <label>Customer Name *</label>
                  <input
                    type="text"
                    value={editForm.customerName}
                    onChange={(e) => handleEditChange('customerName', e.target.value)}
                    placeholder="Customer name"
                  />
                </div>
                <div className="form-group">
                  <label>Customer ID *</label>
                  <input
                    type="text"
                    value={editForm.customerId}
                    onChange={(e) => handleEditChange('customerId', e.target.value)}
                    placeholder="Customer ID"
                  />
                </div>
              </div>

              <div className="order-details-section">
                <h3>Order Information</h3>
                <div className="form-group">
                  <label>Order Source</label>
                  <select
                    value={editForm.orderFrom}
                    onChange={(e) => handleEditChange('orderFrom', e.target.value)}
                    className="status-select"
                  >
                    {ORDER_SOURCES.map(source => (
                      <option key={source.value} value={source.value}>
                        {source.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => handleEditChange('status', e.target.value)}
                    className="status-select"
                  >
                    {ORDER_STATUSES.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Confirmation Status</label>
                  <select
                    value={editForm.confirmationStatus}
                    onChange={(e) => handleEditChange('confirmationStatus', e.target.value)}
                    className="status-select"
                  >
                    {CONFIRMATION_STATUSES.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Expected Delivery Date</label>
                  <input
                    type="date"
                    value={editForm.expectedDeliveryDate}
                    onChange={(e) => handleEditChange('expectedDeliveryDate', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Priority Level</label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => handleEditChange('priority', parseInt(e.target.value, 10))}
                    className="status-select"
                  >
                    {PRIORITY_LEVELS.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="order-details-section">
                <h3>Payment Information</h3>
                <div className="form-group">
                  <label>Payment Status</label>
                  <select
                    value={editForm.paymentStatus}
                    onChange={(e) => handleEditChange('paymentStatus', e.target.value)}
                    className="status-select"
                  >
                    {PAYMENT_STATUSES.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
                {editForm.paymentStatus === 'partially_paid' && (
                  <div className="form-group">
                    <label>Amount Paid</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.paidAmount}
                      onChange={(e) => handleEditChange('paidAmount', e.target.value)}
                      placeholder="Enter amount paid"
                    />
                  </div>
                )}
              </div>

              <div className="order-details-section">
                <h3>Customer Notes</h3>
                <div className="form-group">
                  <textarea
                    value={editForm.customerNotes}
                    onChange={(e) => handleEditChange('customerNotes', e.target.value)}
                    placeholder="Enter any notes about this customer or order"
                    rows={3}
                    style={{ resize: 'vertical', width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '15px' }}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={handleCancelEdit} className="cancel-btn">
                  Cancel
                </button>
                <button type="button" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="order-details-section">
                <h3>Customer Information</h3>
                <div className="detail-row">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{order.customerName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Customer ID:</span>
                  <span className="detail-value">{order.customerId}</span>
                </div>
              </div>

              <div className="order-details-section">
                <h3>Order Information</h3>
                <div className="detail-row">
                  <span className="detail-label">Source:</span>
                  <span className="detail-value">
                    <span className="source-badge">{order.orderFrom}</span>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className="detail-value">
                    <span className={`status-badge ${getStatusClass(order.status)}`}>
                      {order.status || 'Pending'}
                    </span>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Confirmation:</span>
                  <span className="detail-value">
                    <span className={`confirmation-badge confirmation-${order.confirmationStatus || 'unconfirmed'}`}>
                      {CONFIRMATION_STATUSES.find(s => s.value === order.confirmationStatus)?.label || 'Unconfirmed'}
                    </span>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Priority:</span>
                  <span className="detail-value">
                    <span className={`priority-level priority-level-${order.priority || 0}`}>
                      {PRIORITY_LEVELS.find(l => l.value === (order.priority || 0))?.label || 'Normal'}
                    </span>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Created:</span>
                  <span className="detail-value">{formatDate(order.createdAt)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Expected Delivery:</span>
                  <span className="detail-value">
                    {formatDeliveryDate(order.expectedDeliveryDate)}
                    {priority && (
                      <span className={`priority-indicator ${priority.className}`}>
                        ({priority.label})
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <div className="order-details-section">
                <h3>Payment Information</h3>
                <div className="detail-row">
                  <span className="detail-label">Payment Status:</span>
                  <span className="detail-value">
                    <span className={`payment-badge payment-${order.paymentStatus || 'unpaid'}`}>
                      {PAYMENT_STATUSES.find(s => s.value === order.paymentStatus)?.label || 'Unpaid'}
                    </span>
                  </span>
                </div>
                {order.paymentStatus === 'partially_paid' && (
                  <div className="detail-row">
                    <span className="detail-label">Amount Paid:</span>
                    <span className="detail-value">{formatPrice(order.paidAmount || 0)}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Balance Due:</span>
                  <span className="detail-value">
                    {formatPrice(order.totalPrice - (order.paidAmount || 0))}
                  </span>
                </div>
              </div>

              {order.customerNotes && (
                <div className="order-details-section">
                  <h3>Customer Notes</h3>
                  <div className="customer-notes-display">
                    {order.customerNotes}
                  </div>
                </div>
              )}

              <div className="order-details-section">
                <h3>Order Items</h3>
                <div className="order-items-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Price</th>
                        <th>Qty</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, index) => (
                        <tr key={index}>
                          <td>
                            <div className="item-name-col">
                              {item.name}
                              {item.customizationRequest && (
                                <span className="customization-note">
                                  Customization: {item.customizationRequest}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>{formatPrice(item.price)}</td>
                          <td>{item.quantity}</td>
                          <td>{formatPrice(item.price * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="3" className="total-label">Total:</td>
                        <td className="total-value">{formatPrice(order.totalPrice)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderDetails;
