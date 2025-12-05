import { useState, useEffect } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import { getOrder } from '../services/api';
import { getPriorityStatus } from '../utils/priorityUtils';

function OrderDetails({ orderId, onClose }) {
  const { formatPrice } = useCurrency();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getOrder(orderId);
        setOrder(data);
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

  if (loading) {
    return (
      <div className="order-details-overlay">
        <div className="order-details-modal">
          <p className="loading-text">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
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
            {priority && (
              <span className={`priority-badge ${priority.className}`}>
                {priority.label}
              </span>
            )}
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="order-details-content">
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
        </div>
      </div>
    </div>
  );
}

export default OrderDetails;
