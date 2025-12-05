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
];

const PRIORITY_LEVELS = [
  { value: 0, label: 'Normal' },
  { value: 1, label: 'Low Priority' },
  { value: 2, label: 'Medium Priority' },
  { value: 3, label: 'High Priority' },
  { value: 4, label: 'Urgent' },
  { value: 5, label: 'Critical' },
];

// Format item display name with color and fabric info
const formatItemDisplayName = (item) => {
  const details = [];
  if (item.color) details.push(item.color);
  if (item.fabric) details.push(item.fabric);
  
  if (details.length > 0) {
    return `${item.name} (${details.join(', ')})`;
  }
  return item.name;
};

function OrderForm({ items, onOrderCreated }) {
  const { formatPrice } = useCurrency();
  const [orderFrom, setOrderFrom] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [paidAmount, setPaidAmount] = useState('');
  const [confirmationStatus, setConfirmationStatus] = useState('unconfirmed');
  const [customerNotes, setCustomerNotes] = useState('');
  const [priority, setPriority] = useState(0);
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
      const item = items.find((i) => String(i._id) === String(orderItem.itemId));
      const qty = parseInt(orderItem.quantity, 10);
      if (item && !isNaN(qty) && qty > 0) {
        return total + item.price * qty;
      }
      return total;
    }, 0);
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
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
        expectedDeliveryDate: expectedDeliveryDate || null,
        paymentStatus,
        paidAmount: paidAmount ? parseFloat(paidAmount) : 0,
        confirmationStatus,
        customerNotes: customerNotes.trim(),
        priority,
      });
      setCreatedOrder(order);
      setOrderFrom('');
      setCustomerName('');
      setCustomerId('');
      setExpectedDeliveryDate('');
      setPaymentStatus('unpaid');
      setPaidAmount('');
      setConfirmationStatus('unconfirmed');
      setCustomerNotes('');
      setPriority(0);
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

        <div className="form-group">
          <label htmlFor="expectedDeliveryDate">Expected Delivery Date</label>
          <input
            id="expectedDeliveryDate"
            type="date"
            value={expectedDeliveryDate}
            onChange={(e) => setExpectedDeliveryDate(e.target.value)}
            min={getMinDate()}
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmationStatus">Confirmation Status</label>
          <select
            id="confirmationStatus"
            value={confirmationStatus}
            onChange={(e) => setConfirmationStatus(e.target.value)}
          >
            {CONFIRMATION_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="paymentStatus">Payment Status</label>
          <select
            id="paymentStatus"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
          >
            {PAYMENT_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {paymentStatus === 'partially_paid' && (
          <div className="form-group">
            <label htmlFor="paidAmount">Amount Paid</label>
            <input
              id="paidAmount"
              type="number"
              min="0"
              step="0.01"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder="Enter amount paid"
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="priority">Priority Level</label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(parseInt(e.target.value, 10))}
          >
            {PRIORITY_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="customerNotes">Customer Notes / Remarks</label>
          <textarea
            id="customerNotes"
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            placeholder="Enter any notes about this customer or order (e.g., follow-up needed, special requirements)"
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="order-items-section">
          <h3>Order Items</h3>
          {orderItems.map((orderItem, index) => {
            const selectedItem = items.find(i => String(i._id) === String(orderItem.itemId));
            const qty = parseInt(orderItem.quantity, 10);
            const lineTotal = selectedItem && !isNaN(qty) && qty > 0 ? selectedItem.price * qty : 0;
            
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
                        {formatItemDisplayName(item)} - {formatPrice(item.price)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={orderItem.quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        handleItemChange(index, 'quantity', '');
                      } else {
                        const parsed = parseInt(val, 10);
                        handleItemChange(index, 'quantity', isNaN(parsed) ? '' : parsed);
                      }
                    }}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (isNaN(val) || val < 1) {
                        handleItemChange(index, 'quantity', 1);
                      }
                    }}
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
                {/* Item details preview when selected */}
                {selectedItem && (
                  <div className="selected-item-details">
                    {selectedItem.imageUrl && (
                      <img 
                        src={selectedItem.imageUrl} 
                        alt={selectedItem.name} 
                        className="selected-item-image"
                      />
                    )}
                    <div className="selected-item-info">
                      {selectedItem.color && <span className="item-detail">Color: {selectedItem.color}</span>}
                      {selectedItem.fabric && <span className="item-detail">Fabric: {selectedItem.fabric}</span>}
                      {selectedItem.specialFeatures && <span className="item-detail">Features: {selectedItem.specialFeatures}</span>}
                    </div>
                  </div>
                )}
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
