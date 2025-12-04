import { useState } from 'react';
import { createItem, deleteItem } from '../services/api';
import { useCurrency } from '../contexts/CurrencyContext';

function ItemPanel({ items, onItemsChange }) {
  const { formatPrice } = useCurrency();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [color, setColor] = useState('');
  const [fabric, setFabric] = useState('');
  const [specialFeatures, setSpecialFeatures] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !price) {
      setError('Please fill in name and price');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Please enter a valid price');
      return;
    }

    setLoading(true);
    try {
      await createItem({ 
        name: name.trim(), 
        price: priceNum,
        color: color.trim(),
        fabric: fabric.trim(),
        specialFeatures: specialFeatures.trim()
      });
      setName('');
      setPrice('');
      setColor('');
      setFabric('');
      setSpecialFeatures('');
      onItemsChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteItem(id);
      onItemsChange();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatItemDetails = (item) => {
    const details = [];
    if (item.color) details.push(`Color: ${item.color}`);
    if (item.fabric) details.push(`Fabric: ${item.fabric}`);
    if (item.specialFeatures) details.push(`Features: ${item.specialFeatures}`);
    return details.join(' | ');
  };

  return (
    <div className="panel">
      <h2>Item Management</h2>
      
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="itemName">Item Name *</label>
          <input
            id="itemName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter item name"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="itemPrice">Price *</label>
          <input
            id="itemPrice"
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Enter price"
          />
        </div>

        <div className="form-group">
          <label htmlFor="itemColor">Color</label>
          <input
            id="itemColor"
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="e.g., Red, Blue, Multi-color"
          />
        </div>

        <div className="form-group">
          <label htmlFor="itemFabric">Fabric</label>
          <input
            id="itemFabric"
            type="text"
            value={fabric}
            onChange={(e) => setFabric(e.target.value)}
            placeholder="e.g., Cotton, Silk, Polyester"
          />
        </div>

        <div className="form-group">
          <label htmlFor="itemSpecialFeatures">Special Features</label>
          <input
            id="itemSpecialFeatures"
            type="text"
            value={specialFeatures}
            onChange={(e) => setSpecialFeatures(e.target.value)}
            placeholder="e.g., Handmade, Embroidered, Washable"
          />
        </div>
        
        {error && <p className="error">{error}</p>}
        
        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Item'}
        </button>
      </form>

      <div className="items-list">
        <h3>Available Items</h3>
        {items.length === 0 ? (
          <p>No items added yet</p>
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item._id} className="item-card">
                <div className="item-info">
                  <span className="item-name-price">{item.name} - {formatPrice(item.price)}</span>
                  {formatItemDetails(item) && (
                    <span className="item-details">{formatItemDetails(item)}</span>
                  )}
                </div>
                <button 
                  onClick={() => handleDelete(item._id)} 
                  className="delete-btn"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default ItemPanel;
