import { useState, useEffect, useCallback } from 'react';
import { createItem, deleteItem, updateItem, getItemsPaginated, getDeletedItems, restoreItem } from '../services/api';
import { useCurrency } from '../contexts/CurrencyContext';

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB max

function ItemPanel({ onItemsChange }) {
  const { formatPrice } = useCurrency();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [color, setColor] = useState('');
  const [fabric, setFabric] = useState('');
  const [specialFeatures, setSpecialFeatures] = useState('');
  const [image, setImage] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Edit mode state
  const [editingItem, setEditingItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Pagination and search for active items
  const [activeItemsData, setActiveItemsData] = useState({ items: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
  const [activeSearch, setActiveSearch] = useState('');
  const [activeSearchInput, setActiveSearchInput] = useState('');
  const [activePagination, setActivePagination] = useState({ page: 1, limit: 10 });
  const [loadingActive, setLoadingActive] = useState(false);
  
  // Deleted items section
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletedItemsData, setDeletedItemsData] = useState({ items: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
  const [deletedSearch, setDeletedSearch] = useState('');
  const [deletedSearchInput, setDeletedSearchInput] = useState('');
  const [deletedPagination, setDeletedPagination] = useState({ page: 1, limit: 10 });
  const [loadingDeleted, setLoadingDeleted] = useState(false);

  const fetchActiveItems = useCallback(async () => {
    setLoadingActive(true);
    try {
      const result = await getItemsPaginated({ 
        page: activePagination.page, 
        limit: activePagination.limit, 
        search: activeSearch 
      });
      setActiveItemsData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingActive(false);
    }
  }, [activePagination.page, activePagination.limit, activeSearch]);

  const fetchDeletedItems = useCallback(async () => {
    setLoadingDeleted(true);
    try {
      const result = await getDeletedItems({ 
        page: deletedPagination.page, 
        limit: deletedPagination.limit, 
        search: deletedSearch 
      });
      setDeletedItemsData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingDeleted(false);
    }
  }, [deletedPagination.page, deletedPagination.limit, deletedSearch]);

  useEffect(() => {
    fetchActiveItems();
  }, [fetchActiveItems]);

  useEffect(() => {
    if (showDeleted) {
      fetchDeletedItems();
    }
  }, [showDeleted, fetchDeletedItems]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setImage('');
      setImagePreview('');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Check file size
    if (file.size > MAX_IMAGE_SIZE) {
      setError('Image size should be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImage('');
    setImagePreview('');
    // Reset file input
    const fileInput = document.getElementById('itemImage');
    if (fileInput) fileInput.value = '';
  };

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
        specialFeatures: specialFeatures.trim(),
        image: image
      });
      setName('');
      setPrice('');
      setColor('');
      setFabric('');
      setSpecialFeatures('');
      setImage('');
      setImagePreview('');
      // Reset file input
      const fileInput = document.getElementById('itemImage');
      if (fileInput) fileInput.value = '';
      onItemsChange();
      fetchActiveItems();
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
      fetchActiveItems();
      if (showDeleted) {
        fetchDeletedItems();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRestore = async (id) => {
    try {
      await restoreItem(id);
      onItemsChange();
      fetchActiveItems();
      fetchDeletedItems();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (item) => {
    setEditingItem({
      ...item,
      editName: item.name,
      editPrice: String(item.price),
      editColor: item.color || '',
      editFabric: item.fabric || '',
      editSpecialFeatures: item.specialFeatures || '',
      editImage: '',
      editImagePreview: item.imageUrl || '',
      removeImage: false
    });
    setShowEditModal(true);
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError('Image size should be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditingItem(prev => ({
        ...prev,
        editImage: reader.result,
        editImagePreview: reader.result,
        removeImage: false
      }));
    };
    reader.readAsDataURL(file);
  };

  const clearEditImage = () => {
    setEditingItem(prev => ({
      ...prev,
      editImage: '',
      editImagePreview: '',
      removeImage: true
    }));
    const fileInput = document.getElementById('editItemImage');
    if (fileInput) fileInput.value = '';
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!editingItem.editName.trim() || !editingItem.editPrice) {
      setError('Please fill in name and price');
      return;
    }

    const priceNum = parseFloat(editingItem.editPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Please enter a valid price');
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        name: editingItem.editName.trim(),
        price: priceNum,
        color: editingItem.editColor.trim(),
        fabric: editingItem.editFabric.trim(),
        specialFeatures: editingItem.editSpecialFeatures.trim()
      };

      // Handle image changes
      if (editingItem.editImage) {
        updateData.image = editingItem.editImage;
      } else if (editingItem.removeImage) {
        updateData.image = null;
      }

      await updateItem(editingItem._id, updateData);
      setShowEditModal(false);
      setEditingItem(null);
      onItemsChange();
      fetchActiveItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingItem(null);
    setError('');
  };

  const handleActiveSearch = (e) => {
    e.preventDefault();
    setActiveSearch(activeSearchInput);
    setActivePagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDeletedSearch = (e) => {
    e.preventDefault();
    setDeletedSearch(deletedSearchInput);
    setDeletedPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearActiveSearch = () => {
    setActiveSearchInput('');
    setActiveSearch('');
    setActivePagination(prev => ({ ...prev, page: 1 }));
  };

  const clearDeletedSearch = () => {
    setDeletedSearchInput('');
    setDeletedSearch('');
    setDeletedPagination(prev => ({ ...prev, page: 1 }));
  };

  // Format item name with color and fabric
  const formatItemName = (item) => {
    const details = [];
    if (item.color) details.push(item.color);
    if (item.fabric) details.push(item.fabric);
    
    if (details.length > 0) {
      return `${item.name} (${details.join(', ')})`;
    }
    return item.name;
  };

  const formatItemDetails = (item) => {
    const details = [];
    if (item.color) details.push(`Color: ${item.color}`);
    if (item.fabric) details.push(`Fabric: ${item.fabric}`);
    if (item.specialFeatures) details.push(`Features: ${item.specialFeatures}`);
    return details.join(' | ');
  };

  const renderPagination = (pagination, onPageChange, onLimitChange) => (
    <div className="items-pagination">
      <div className="page-size-selector">
        <label>Per page:</label>
        <select
          value={pagination.limit}
          onChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
        >
          {PAGE_SIZE_OPTIONS.map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </div>
      <div className="pagination-info">
        Page {pagination.page} of {pagination.totalPages || 1} ({pagination.total} items)
      </div>
      <div className="pagination-buttons">
        <button
          className="pagination-btn"
          onClick={() => onPageChange(1)}
          disabled={pagination.page === 1}
        >
          First
        </button>
        <button
          className="pagination-btn"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page === 1}
        >
          Prev
        </button>
        <button
          className="pagination-btn"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page === pagination.totalPages || pagination.totalPages === 0}
        >
          Next
        </button>
        <button
          className="pagination-btn"
          onClick={() => onPageChange(pagination.totalPages)}
          disabled={pagination.page === pagination.totalPages || pagination.totalPages === 0}
        >
          Last
        </button>
      </div>
    </div>
  );

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

        <div className="form-group">
          <label htmlFor="itemImage">Item Image</label>
          <div className="image-upload-container">
            <input
              id="itemImage"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="image-input"
            />
            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Preview" />
                <button type="button" onClick={clearImage} className="clear-image-btn">
                  ✕
                </button>
              </div>
            )}
            <small className="image-hint">Max size: 2MB</small>
          </div>
        </div>
        
        {error && <p className="error">{error}</p>}
        
        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Item'}
        </button>
      </form>

      <div className="items-list">
        <div className="items-list-header">
          <h3>Available Items</h3>
          <button 
            className={`toggle-deleted-btn ${showDeleted ? 'active' : ''}`}
            onClick={() => setShowDeleted(!showDeleted)}
          >
            {showDeleted ? 'Hide Deleted' : 'Show Deleted'} ({deletedItemsData.pagination.total || 0})
          </button>
        </div>
        
        {/* Search for active items */}
        <form onSubmit={handleActiveSearch} className="items-search-form">
          <input
            type="text"
            placeholder="Search by name, color, fabric..."
            value={activeSearchInput}
            onChange={(e) => setActiveSearchInput(e.target.value)}
            className="items-search-input"
          />
          <button type="submit" className="search-btn">Search</button>
          {activeSearch && (
            <button type="button" onClick={clearActiveSearch} className="clear-search-btn">Clear</button>
          )}
        </form>
        
        {loadingActive ? (
          <p className="loading-text">Loading items...</p>
        ) : activeItemsData.items.length === 0 ? (
          <p>No items found</p>
        ) : (
          <>
            <ul>
              {activeItemsData.items.map((item) => (
                <li key={item._id} className="item-card">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} className="item-thumbnail" />
                  )}
                  <div className="item-info">
                    <span className="item-name-price">{formatItemName(item)} - {formatPrice(item.price)}</span>
                    {formatItemDetails(item) && (
                      <span className="item-details">{formatItemDetails(item)}</span>
                    )}
                  </div>
                  <div className="item-actions">
                    <button 
                      onClick={() => handleEdit(item)} 
                      className="edit-btn"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(item._id)} 
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {renderPagination(
              activeItemsData.pagination,
              (page) => setActivePagination(prev => ({ ...prev, page })),
              (limit) => setActivePagination({ page: 1, limit })
            )}
          </>
        )}
      </div>

      {/* Deleted Items Section */}
      {showDeleted && (
        <div className="items-list deleted-items-section">
          <h3>🗑️ Deleted Items</h3>
          
          <form onSubmit={handleDeletedSearch} className="items-search-form">
            <input
              type="text"
              placeholder="Search deleted items..."
              value={deletedSearchInput}
              onChange={(e) => setDeletedSearchInput(e.target.value)}
              className="items-search-input"
            />
            <button type="submit" className="search-btn">Search</button>
            {deletedSearch && (
              <button type="button" onClick={clearDeletedSearch} className="clear-search-btn">Clear</button>
            )}
          </form>
          
          {loadingDeleted ? (
            <p className="loading-text">Loading deleted items...</p>
          ) : deletedItemsData.items.length === 0 ? (
            <p>No deleted items found</p>
          ) : (
            <>
              <ul>
                {deletedItemsData.items.map((item) => (
                  <li key={item._id} className="item-card deleted-item">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} className="item-thumbnail" />
                    )}
                    <div className="item-info">
                      <span className="item-name-price">{formatItemName(item)} - {formatPrice(item.price)}</span>
                      {formatItemDetails(item) && (
                        <span className="item-details">{formatItemDetails(item)}</span>
                      )}
                      <span className="deleted-date">
                        Deleted: {new Date(item.deletedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleRestore(item._id)} 
                      className="restore-btn"
                    >
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
              {renderPagination(
                deletedItemsData.pagination,
                (page) => setDeletedPagination(prev => ({ ...prev, page })),
                (limit) => setDeletedPagination({ page: 1, limit })
              )}
            </>
          )}
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditModal && editingItem && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Item</h3>
              <button className="close-btn" onClick={closeEditModal}>×</button>
            </div>
            <form onSubmit={handleEditSubmit} className="form">
              <div className="form-group">
                <label htmlFor="editItemName">Item Name *</label>
                <input
                  id="editItemName"
                  type="text"
                  value={editingItem.editName}
                  onChange={(e) => setEditingItem(prev => ({ ...prev, editName: e.target.value }))}
                  placeholder="Enter item name"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="editItemPrice">Price *</label>
                <input
                  id="editItemPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingItem.editPrice}
                  onChange={(e) => setEditingItem(prev => ({ ...prev, editPrice: e.target.value }))}
                  placeholder="Enter price"
                />
              </div>

              <div className="form-group">
                <label htmlFor="editItemColor">Color</label>
                <input
                  id="editItemColor"
                  type="text"
                  value={editingItem.editColor}
                  onChange={(e) => setEditingItem(prev => ({ ...prev, editColor: e.target.value }))}
                  placeholder="e.g., Red, Blue, Multi-color"
                />
              </div>

              <div className="form-group">
                <label htmlFor="editItemFabric">Fabric</label>
                <input
                  id="editItemFabric"
                  type="text"
                  value={editingItem.editFabric}
                  onChange={(e) => setEditingItem(prev => ({ ...prev, editFabric: e.target.value }))}
                  placeholder="e.g., Cotton, Silk, Polyester"
                />
              </div>

              <div className="form-group">
                <label htmlFor="editItemSpecialFeatures">Special Features</label>
                <input
                  id="editItemSpecialFeatures"
                  type="text"
                  value={editingItem.editSpecialFeatures}
                  onChange={(e) => setEditingItem(prev => ({ ...prev, editSpecialFeatures: e.target.value }))}
                  placeholder="e.g., Handmade, Embroidered, Washable"
                />
              </div>

              <div className="form-group">
                <label htmlFor="editItemImage">Item Image</label>
                <div className="image-upload-container">
                  <input
                    id="editItemImage"
                    type="file"
                    accept="image/*"
                    onChange={handleEditImageChange}
                    className="image-input"
                  />
                  {editingItem.editImagePreview && (
                    <div className="image-preview">
                      <img src={editingItem.editImagePreview} alt="Preview" />
                      <button type="button" onClick={clearEditImage} className="clear-image-btn">
                        ✕
                      </button>
                    </div>
                  )}
                  <small className="image-hint">Max size: 2MB. Upload a new image to replace the existing one.</small>
                </div>
              </div>
              
              {error && <p className="error">{error}</p>}
              
              <div className="modal-actions">
                <button type="button" onClick={closeEditModal} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ItemPanel;
