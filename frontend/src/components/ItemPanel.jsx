import { useState } from 'react';
import { createItem, deleteItem } from '../services/api';

function ItemPanel({ items, onItemsChange }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !price) {
      setError('Please fill in all fields');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Please enter a valid price');
      return;
    }

    setLoading(true);
    try {
      await createItem({ name: name.trim(), price: priceNum });
      setName('');
      setPrice('');
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

  return (
    <div className="panel">
      <h2>Item Management</h2>
      
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="itemName">Item Name</label>
          <input
            id="itemName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter item name"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="itemPrice">Price</label>
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
              <li key={item._id}>
                <span>{item.name} - ${item.price.toFixed(2)}</span>
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
