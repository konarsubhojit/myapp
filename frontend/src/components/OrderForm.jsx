import { useState } from 'react';
import { createOrder } from '../services/api';
import { useCurrency } from '../contexts/CurrencyContext';

const ORDER_SOURCES = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'call', label: 'Call' },
  { value: 'offline', label: 'Offline' },
];

function OrderForm({ items, onOrderCreated }) {
  const { formatPrice } = useCurrency();
  const [orderFrom, setOrderFrom] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [orderItems, setOrderItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);

  const handleAddItem = () => {
    setOrderItems([...orderItems, { itemId: '', quantity: 1, customizationRequest: '' }]);
  };

  const handleRemoveItem = (index) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: value };
    setOrderItems(updated);
  };

  const calculateTotal = () => {
    return orderItems.reduce((total, orderItem) => {
      const item = items.find((i) => i._id === orderItem.itemId);
      if (item && orderItem.quantity > 0) {
        return total + item.price * orderItem.quantity;
      }
      return total;
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCreatedOrder(null);

    if (!orderFrom || !customerName.trim() || !customerId.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (orderItems.length === 0) {
      setError('Please add at least one item');
      return;
    }

    const hasEmptyItems = orderItems.some((item) => !item.itemId || item.quantity < 1);
    if (hasEmptyItems) {
      setError('Please select an item and quantity for all items');
      return;
    }

    setLoading(true);
    try {
      const order = await createOrder({
        orderFrom,
        customerName: customerName.trim(),
        customerId: customerId.trim(),
        items: orderItems,
      });
      setCreatedOrder(order);
      setOrderFrom('');
      setCustomerName('');
      setCustomerId('');
      setOrderItems([]);
      onOrderCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const estimatedTotal = calculateTotal();

  return (
    <div className="panel">
      <h2>Create Order</h2>

      {createdOrder && (
        <div className="success-message">
          <h3>Order Created Successfully!</h3>
          <p><strong>Order ID:</strong> {createdOrder.orderId}</p>
          <p><strong>Total Price:</strong> {formatPrice(createdOrder.totalPrice)}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="orderFrom">Order Source *</label>
          <select
            id="orderFrom"
            value={orderFrom}
            onChange={(e) => setOrderFrom(e.target.value)}
          >
            <option value="">Select source</option>
            {ORDER_SOURCES.map((source) => (
              <option key={source.value} value={source.value}>
                {source.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="customerName">Customer Name *</label>
          <input
            id="customerName"
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Enter customer name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="customerId">Customer ID (Insta ID / Phone) *</label>
          <input
            id="customerId"
            type="text"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="Enter customer ID"
          />
        </div>

        <div className="order-items-section">
          <h3>Order Items</h3>
          {orderItems.map((orderItem, index) => {
            const selectedItem = items.find(i => i._id === orderItem.itemId);
            const lineTotal = selectedItem ? selectedItem.price * orderItem.quantity : 0;
            
            return (
              <div key={index} className="order-item-block">
                <div className="order-item-row">
                  <select
                    value={orderItem.itemId}
                    onChange={(e) => handleItemChange(index, 'itemId', e.target.value)}
                  >
                    <option value="">Select item</option>
                    {items.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name} - {formatPrice(item.price)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={orderItem.quantity}
                    onChange={(e) =>
                      handleItemChange(index, 'quantity', parseInt(e.target.value, 10) || 1)
                    }
                    placeholder="Qty"
                  />
                  <span className="line-total">{formatPrice(lineTotal)}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="remove-btn"
                  >
                    Remove
                  </button>
                </div>
                <div className="customization-row">
                  <input
                    type="text"
                    value={orderItem.customizationRequest}
                    onChange={(e) => handleItemChange(index, 'customizationRequest', e.target.value)}
                    placeholder="Customization request (optional)"
                    className="customization-input"
                  />
                </div>
              </div>
            );
          })}
          <button type="button" onClick={handleAddItem} className="add-item-btn">
            + Add Item
          </button>
        </div>

        {orderItems.length > 0 && (
          <div className="total-preview">
            <strong>Estimated Total: {formatPrice(estimatedTotal)}</strong>
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading || items.length === 0}>
          {loading ? 'Creating Order...' : 'Create Order'}
        </button>

        {items.length === 0 && (
          <p className="info">Add items in the Item Management panel first</p>
        )}
      </form>
    </div>
  );
}

export default OrderForm;
