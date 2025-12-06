import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createOrder, getOrder } from '../services/api';
import { useCurrency } from '../contexts/CurrencyContext';
import {
  ORDER_SOURCES,
  PAYMENT_STATUSES,
  CONFIRMATION_STATUSES,
  PRIORITY_LEVELS,
} from '../constants/orderConstants';

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
  const { orderId: duplicateOrderId } = useParams();
  const navigate = useNavigate();
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
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [duplicatedFrom, setDuplicatedFrom] = useState(null);

  // Load order data when duplicating
  useEffect(() => {
    const loadOrderForDuplication = async () => {
      if (!duplicateOrderId || items.length === 0) return;
      
      setDuplicateLoading(true);
      setError('');
      try {
        const order = await getOrder(duplicateOrderId);
        setDuplicatedFrom(order.orderId);
        
        // Pre-fill form with order data (except payment info which should be fresh)
        setOrderFrom(order.orderFrom || '');
        setCustomerName(order.customerName || '');
        setCustomerId(order.customerId || '');
        setCustomerNotes(order.customerNotes || '');
        setPriority(order.priority || 0);
        
        // Reset payment info for new order
        setPaymentStatus('unpaid');
        setPaidAmount('');
        setConfirmationStatus('unconfirmed');
        setExpectedDeliveryDate('');
        
        // Create lookup maps for efficient item matching
        const itemsByIdMap = new Map(items.map(i => [String(i._id), i]));
        const itemsByNameMap = new Map(items.map(i => [i.name.toLowerCase(), i]));
        
        // Map order items - try to match by itemId first, then by name
        const mappedItems = order.items.map(orderItem => {
          // Try to find the item by ID first
          let matchedItem = itemsByIdMap.get(String(orderItem.item));
          
          // If not found by ID, try to match by name (for cases where same item exists)
          if (!matchedItem) {
            matchedItem = itemsByNameMap.get(orderItem.name.toLowerCase());
          }
          
          return {
            itemId: matchedItem ? String(matchedItem._id) : '',
            quantity: orderItem.quantity || 1,
            customizationRequest: orderItem.customizationRequest || ''
          };
        }).filter(item => item.itemId); // Only include items that were found
        
        setOrderItems(mappedItems);
        
        if (mappedItems.length < order.items.length) {
          setError(`Note: Some items from the original order could not be found in current inventory.`);
        }
      } catch (err) {
        setError('Failed to load order for duplication: ' + err.message);
      } finally {
        setDuplicateLoading(false);
      }
    };
    
    loadOrderForDuplication();
  }, [duplicateOrderId, items]);

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

  const resetForm = () => {
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
    setDuplicatedFrom(null);
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
      resetForm();
      onOrderCreated();
      
      // Navigate back to /orders/new if we were duplicating
      if (duplicateOrderId) {
        navigate('/orders/new', { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDuplicate = () => {
    resetForm();
    navigate('/orders/new', { replace: true });
  };

  const estimatedTotal = calculateTotal();

  if (duplicateLoading) {
    return (
      <div className="panel">
        <h2>Loading Order Data...</h2>
        <p className="loading-text">Preparing order for duplication...</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>{duplicatedFrom ? `Duplicate Order (from ${duplicatedFrom})` : 'Create Order'}</h2>

      {duplicatedFrom && (
        <div className="duplicate-notice">
          <p>
            <strong>📋 Duplicating order {duplicatedFrom}</strong> - 
            Review the pre-filled details and make any changes before creating the new order.
          </p>
          <button 
            type="button" 
            onClick={handleCancelDuplicate}
            className="cancel-duplicate-btn"
          >
            Cancel Duplication
          </button>
        </div>
      )}

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
            className="customer-notes-input"
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
