import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import imageCompression from 'browser-image-compression';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import CardActions from '@mui/material/CardActions';
import Grid from '@mui/material/Grid2';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Pagination from '@mui/material/Pagination';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Collapse from '@mui/material/Collapse';
import InputAdornment from '@mui/material/InputAdornment';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RestoreIcon from '@mui/icons-material/Restore';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import ImageIcon from '@mui/icons-material/Image';
import { createItem, deleteItem, updateItem, getItemsPaginated, getDeletedItems, restoreItem, permanentlyDeleteItem } from '../services/api';
import { useCurrency } from '../contexts/CurrencyContext';
import { useNotification } from '../contexts/NotificationContext';

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB max upload size
const TARGET_IMAGE_SIZE = 2 * 1024 * 1024; // Compress to 2MB max

// Image compression options
const compressionOptions = {
  maxSizeMB: TARGET_IMAGE_SIZE / (1024 * 1024), // Convert bytes to MB
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/jpeg',
};

// Helper to convert file to base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Compress image if needed
const compressImage = async (file) => {
  // If file is already small enough, just convert to base64
  if (file.size <= TARGET_IMAGE_SIZE) {
    return fileToBase64(file);
  }

  // Compress the image
  const compressedFile = await imageCompression(file, compressionOptions);
  return fileToBase64(compressedFile);
};

/**
 * Validates an image file for size and type
 * @param {File} file - The file to validate
 * @returns {Object} - Returns {valid: true} or {valid: false, error: string}
 */
const validateImageFile = (file) => {
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Please select a valid image file' };
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return { valid: false, error: 'Image size should be less than 5MB' };
  }

  return { valid: true };
};

/**
 * Process an image file upload with validation and compression
 * @param {File} file - The image file to process
 * @param {Function} [showSuccess] - Optional callback to show success notification
 * @returns {Promise<string>} - Base64 encoded image string
 * @throws {Error} - If validation fails or processing encounters an error
 */
const processImageUpload = async (file, showSuccess) => {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const base64Image = await compressImage(file);
  const wasCompressed = file.size > TARGET_IMAGE_SIZE;
  
  if (wasCompressed && showSuccess) {
    showSuccess('Image was compressed for optimal upload');
  }
  
  return base64Image;
};

// Parse URL params to state
const parseUrlParams = (searchParams) => {
  const page = Number.parseInt(searchParams.get('page'), 10);
  const limit = Number.parseInt(searchParams.get('limit'), 10);
  
  return {
    page: Number.isNaN(page) || page < 1 ? 1 : page,
    limit: PAGE_SIZE_OPTIONS.includes(limit) ? limit : 10,
    search: searchParams.get('search') || '',
    showDeleted: searchParams.get('deleted') === 'true',
  };
};

/**
 * Renders pagination controls for item lists
 */
const renderPaginationControls = (paginationData, onPageChange, onLimitChange) => (
  <Box 
    sx={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 2,
      mt: 2,
      p: 2,
      bgcolor: 'grey.50',
      borderRadius: 2,
    }}
  >
    <FormControl size="small" sx={{ minWidth: 100 }}>
      <InputLabel id="page-size-label">Per page</InputLabel>
      <Select
        labelId="page-size-label"
        value={paginationData.limit}
        label="Per page"
        onChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
      >
        {PAGE_SIZE_OPTIONS.map(size => (
          <MenuItem key={size} value={size}>{size}</MenuItem>
        ))}
      </Select>
    </FormControl>
    <Typography variant="body2" color="text.secondary">
      Page {paginationData.page} of {paginationData.totalPages || 1} ({paginationData.total} items)
    </Typography>
    <Pagination
      count={paginationData.totalPages || 1}
      page={paginationData.page}
      onChange={(event, page) => onPageChange(page)}
      color="primary"
      showFirstButton
      showLastButton
      size="small"
    />
  </Box>
);

function ItemPanel({ onItemsChange }) {
  const { formatPrice } = useCurrency();
  const { showSuccess, showError } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Parse initial state from URL
  const initialState = parseUrlParams(searchParams);
  
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [color, setColor] = useState('');
  const [fabric, setFabric] = useState('');
  const [specialFeatures, setSpecialFeatures] = useState('');
  const [image, setImage] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Copy mode state - tracks if form is pre-filled from copying an item
  const [copiedFrom, setCopiedFrom] = useState(null);
  
  // Edit mode state
  const [editingItem, setEditingItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Pagination and search for active items
  const [activeItemsData, setActiveItemsData] = useState({ items: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
  const [activeSearch, setActiveSearch] = useState(initialState.search);
  const [activeSearchInput, setActiveSearchInput] = useState(initialState.search);
  const [activePagination, setActivePagination] = useState({ page: initialState.page, limit: initialState.limit });
  const [loadingActive, setLoadingActive] = useState(false);
  
  // Deleted items section
  const [showDeleted, setShowDeleted] = useState(initialState.showDeleted);
  const [deletedItemsData, setDeletedItemsData] = useState({ items: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
  const [deletedSearch, setDeletedSearch] = useState('');
  const [deletedSearchInput, setDeletedSearchInput] = useState('');
  const [deletedPagination, setDeletedPagination] = useState({ page: 1, limit: 10 });
  const [loadingDeleted, setLoadingDeleted] = useState(false);

  // Update URL when state changes
  const updateUrl = useCallback((search, pagination, deleted) => {
    const params = new URLSearchParams();
    if (pagination.page > 1) params.set('page', pagination.page);
    if (pagination.limit !== 10) params.set('limit', pagination.limit);
    if (search) params.set('search', search);
    if (deleted) params.set('deleted', 'true');
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  // Update URL when state changes
  useEffect(() => {
    updateUrl(activeSearch, activePagination, showDeleted);
  }, [activeSearch, activePagination, showDeleted, updateUrl]);

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

  // State for image processing
  const [imageProcessing, setImageProcessing] = useState(false);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      setImage('');
      setImagePreview('');
      return;
    }

    setImageProcessing(true);
    setError('');
    
    try {
      const base64Image = await processImageUpload(file, showSuccess);
      setImage(base64Image);
      setImagePreview(base64Image);
    } catch (err) {
      setError(err.message || 'Failed to process image. Please try a different file.');
      console.error('Image compression error:', err);
    } finally {
      setImageProcessing(false);
    }
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
      const itemName = name.trim();
      setName('');
      setPrice('');
      setColor('');
      setFabric('');
      setSpecialFeatures('');
      setImage('');
      setImagePreview('');
      setCopiedFrom(null); // Clear copy mode
      // Reset file input
      const fileInput = document.getElementById('itemImage');
      if (fileInput) fileInput.value = '';
      onItemsChange();
      fetchActiveItems();
      showSuccess(`Item "${itemName}" has been added successfully.`);
    } catch (err) {
      setError(err.message);
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, itemName) => {
    if (!globalThis.confirm(`Are you sure you want to delete "${itemName}"? This item can be restored later.`)) {
      return;
    }
    try {
      await deleteItem(id);
      onItemsChange();
      fetchActiveItems();
      if (showDeleted) {
        fetchDeletedItems();
      }
      showSuccess(`Item "${itemName}" has been deleted.`);
    } catch (err) {
      setError(err.message);
      showError(err.message);
    }
  };

  const handleRestore = async (id, itemName) => {
    try {
      await restoreItem(id);
      onItemsChange();
      fetchActiveItems();
      fetchDeletedItems();
      showSuccess(`Item "${itemName}" has been restored.`);
    } catch (err) {
      setError(err.message);
      showError(err.message);
    }
  };

  const handlePermanentDelete = async (id, itemName, hasImage) => {
    const message = hasImage 
      ? `Are you sure you want to permanently remove the image for "${itemName}"? This action cannot be undone. The item record will be kept for historical orders.`
      : `This item "${itemName}" has no image to remove.`;
    
    if (!hasImage) {
      showError(message);
      return;
    }

    if (!globalThis.confirm(message)) {
      return;
    }

    try {
      await permanentlyDeleteItem(id);
      fetchDeletedItems();
      showSuccess(`Image for item "${itemName}" has been permanently removed.`);
    } catch (err) {
      setError(err.message);
      showError(err.message);
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

  // Copy item - pre-fill the create form with existing item data
  const handleCopy = (item) => {
    setName(item.name);
    setPrice(String(item.price));
    setColor(item.color || '');
    setFabric(item.fabric || '');
    setSpecialFeatures(item.specialFeatures || '');
    // Don't copy the image - user should upload a new one or leave blank
    setImage('');
    setImagePreview('');
    setCopiedFrom(item.name);
    setError('');
    // Scroll to top of the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cancel copy mode and clear form
  const handleCancelCopy = () => {
    setName('');
    setPrice('');
    setColor('');
    setFabric('');
    setSpecialFeatures('');
    setImage('');
    setImagePreview('');
    setCopiedFrom(null);
    setError('');
    // Reset file input
    const fileInput = document.getElementById('itemImage');
    if (fileInput) fileInput.value = '';
  };

  // State for edit image processing
  const [editImageProcessing, setEditImageProcessing] = useState(false);

  const handleEditImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setEditImageProcessing(true);
    setError('');
    
    try {
      const base64Image = await processImageUpload(file, showSuccess);
      setEditingItem(prev => ({
        ...prev,
        editImage: base64Image,
        editImagePreview: base64Image,
        removeImage: false
      }));
    } catch (err) {
      setError(err.message || 'Failed to process image. Please try a different file.');
      console.error('Image compression error:', err);
    } finally {
      setEditImageProcessing(false);
    }
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

      const itemName = editingItem.editName.trim();
      await updateItem(editingItem._id, updateData);
      setShowEditModal(false);
      setEditingItem(null);
      onItemsChange();
      fetchActiveItems();
      showSuccess(`Item "${itemName}" has been updated.`);
    } catch (err) {
      setError(err.message);
      showError(err.message);
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

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" component="h2" gutterBottom fontWeight={600}>
        Item Management
      </Typography>
      
      {/* Copy mode notice */}
      <Collapse in={!!copiedFrom}>
        <Alert 
          severity="info" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={handleCancelCopy}>
              Cancel
            </Button>
          }
        >
          <strong>📋 Creating variant of &quot;{copiedFrom}&quot;</strong> — 
          Modify the color, fabric, or features to create a new item variant.
        </Alert>
      </Collapse>
      
      <Box component="form" onSubmit={handleSubmit} sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              id="itemName"
              label="Item Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter item name"
              fullWidth
              required
              aria-required="true"
            />
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              id="itemPrice"
              label="Price"
              type="number"
              inputProps={{ step: '0.01', min: '0' }}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter price"
              fullWidth
              required
              aria-required="true"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              id="itemColor"
              label="Color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="e.g., Red, Blue, Multi-color"
              fullWidth
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              id="itemFabric"
              label="Fabric"
              value={fabric}
              onChange={(e) => setFabric(e.target.value)}
              placeholder="e.g., Cotton, Silk, Polyester"
              fullWidth
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              id="itemSpecialFeatures"
              label="Special Features"
              value={specialFeatures}
              onChange={(e) => setSpecialFeatures(e.target.value)}
              placeholder="e.g., Handmade, Embroidered"
              fullWidth
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Item Image (Max size: 5MB, auto-compressed)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={imageProcessing ? <CircularProgress size={16} /> : <ImageIcon />}
                disabled={imageProcessing}
              >
                {imageProcessing ? 'Processing...' : 'Upload Image'}
                <input
                  id="itemImage"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  hidden
                />
              </Button>
              {imagePreview && (
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <Box
                    component="img"
                    src={imagePreview}
                    alt="Preview"
                    sx={{ 
                      width: 80, 
                      height: 80, 
                      objectFit: 'cover', 
                      borderRadius: 1,
                      border: '2px solid',
                      borderColor: 'grey.300',
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={clearImage}
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      bgcolor: 'error.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'error.dark' },
                    }}
                    aria-label="Remove image"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        
        <Button 
          type="submit" 
          variant="contained" 
          size="large"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
          sx={{ mt: 3 }}
        >
          {loading ? 'Adding...' : 'Add Item'}
        </Button>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Typography variant="h6" component="h3">
            Available Items
          </Typography>
          <Button
            variant={showDeleted ? 'contained' : 'outlined'}
            color={showDeleted ? 'warning' : 'inherit'}
            startIcon={<DeleteOutlineIcon />}
            onClick={() => setShowDeleted(!showDeleted)}
            size="small"
          >
            {showDeleted ? 'Hide Deleted' : 'Show Deleted'} ({deletedItemsData.pagination.total || 0})
          </Button>
        </Box>
        
        {/* Search for active items */}
        <Box component="form" onSubmit={handleActiveSearch} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <TextField
            size="small"
            placeholder="Search by name, color, fabric..."
            value={activeSearchInput}
            onChange={(e) => setActiveSearchInput(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            aria-label="Search items"
          />
          <Button type="submit" variant="contained" size="small">
            Search
          </Button>
          {activeSearch && (
            <Button 
              type="button" 
              variant="outlined" 
              size="small"
              onClick={clearActiveSearch}
              startIcon={<ClearIcon />}
            >
              Clear
            </Button>
          )}
        </Box>
        
        {loadingActive ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : activeItemsData.items.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={4}>
            No items found
          </Typography>
        ) : (
          <>
            <Grid container spacing={2}>
              {activeItemsData.items.map((item) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item._id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {item.imageUrl ? (
                      <CardMedia
                        component="img"
                        height="140"
                        image={item.imageUrl}
                        alt={item.name}
                        sx={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <Box 
                        sx={{ 
                          height: 140, 
                          bgcolor: 'grey.100', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}
                      >
                        <ImageIcon sx={{ fontSize: 48, color: 'grey.400' }} />
                      </Box>
                    )}
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        {item.name}
                      </Typography>
                      <Typography variant="h6" color="primary" gutterBottom>
                        {formatPrice(item.price)}
                      </Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {item.color && <Chip label={item.color} size="small" variant="outlined" />}
                        {item.fabric && <Chip label={item.fabric} size="small" variant="outlined" />}
                      </Stack>
                      {item.specialFeatures && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {item.specialFeatures}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'flex-end', p: 1.5 }}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleCopy(item)}
                        title="Copy this item to create a variant"
                        aria-label={`Copy ${item.name}`}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleEdit(item)}
                        aria-label={`Edit ${item.name}`}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDelete(item._id, item.name)}
                        aria-label={`Delete ${item.name}`}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
            {renderPaginationControls(
              activeItemsData.pagination,
              (page) => setActivePagination(prev => ({ ...prev, page })),
              (limit) => setActivePagination({ page: 1, limit })
            )}
          </>
        )}
      </Box>

      {/* Deleted Items Section */}
      <Collapse in={showDeleted}>
        <Paper sx={{ mt: 3, p: 2, bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200' }}>
          <Typography variant="h6" component="h3" color="error.dark" gutterBottom>
            🗑️ Deleted Items
          </Typography>
          
          <Box component="form" onSubmit={handleDeletedSearch} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <TextField
              size="small"
              placeholder="Search deleted items..."
              value={deletedSearchInput}
              onChange={(e) => setDeletedSearchInput(e.target.value)}
              sx={{ flexGrow: 1, minWidth: 200 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              aria-label="Search deleted items"
            />
            <Button type="submit" variant="contained" size="small">
              Search
            </Button>
            {deletedSearch && (
              <Button 
                type="button" 
                variant="outlined" 
                size="small"
                onClick={clearDeletedSearch}
                startIcon={<ClearIcon />}
              >
                Clear
              </Button>
            )}
          </Box>
          
          {loadingDeleted ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : deletedItemsData.items.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={4}>
              No deleted items found
            </Typography>
          ) : (
            <>
              <Stack spacing={1}>
                {deletedItemsData.items.map((item) => (
                  <Card key={item._id} variant="outlined" sx={{ bgcolor: 'background.paper' }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      {item.imageUrl && (
                        <Box
                          component="img"
                          src={item.imageUrl}
                          alt={item.name}
                          sx={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 1 }}
                        />
                      )}
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap>
                          {formatItemName(item)} - {formatPrice(item.price)}
                        </Typography>
                        <Typography variant="caption" color="error.main">
                          Deleted: {new Date(item.deletedAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteForeverIcon />}
                          onClick={() => handlePermanentDelete(item._id, item.name, !!item.imageUrl)}
                          title="Permanently remove image"
                          disabled={!item.imageUrl}
                        >
                          Remove Image
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<RestoreIcon />}
                          onClick={() => handleRestore(item._id, item.name)}
                        >
                          Restore
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
              {renderPaginationControls(
                deletedItemsData.pagination,
                (page) => setDeletedPagination(prev => ({ ...prev, page })),
                (limit) => setDeletedPagination({ page: 1, limit })
              )}
            </>
          )}
        </Paper>
      </Collapse>

      {/* Edit Item Modal */}
      <Dialog 
        open={showEditModal && !!editingItem} 
        onClose={closeEditModal}
        maxWidth="sm"
        fullWidth
        aria-labelledby="edit-item-dialog-title"
      >
        <DialogTitle id="edit-item-dialog-title" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Edit Item
          <IconButton onClick={closeEditModal} aria-label="Close dialog">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {editingItem && (
            <Box component="form" id="edit-item-form" onSubmit={handleEditSubmit}>
              <Stack spacing={2}>
                <TextField
                  id="editItemName"
                  label="Item Name"
                  value={editingItem.editName}
                  onChange={(e) => setEditingItem(prev => ({ ...prev, editName: e.target.value }))}
                  placeholder="Enter item name"
                  fullWidth
                  required
                />
                
                <TextField
                  id="editItemPrice"
                  label="Price"
                  type="number"
                  inputProps={{ step: '0.01', min: '0' }}
                  value={editingItem.editPrice}
                  onChange={(e) => setEditingItem(prev => ({ ...prev, editPrice: e.target.value }))}
                  placeholder="Enter price"
                  fullWidth
                  required
                />

                <TextField
                  id="editItemColor"
                  label="Color"
                  value={editingItem.editColor}
                  onChange={(e) => setEditingItem(prev => ({ ...prev, editColor: e.target.value }))}
                  placeholder="e.g., Red, Blue, Multi-color"
                  fullWidth
                />

                <TextField
                  id="editItemFabric"
                  label="Fabric"
                  value={editingItem.editFabric}
                  onChange={(e) => setEditingItem(prev => ({ ...prev, editFabric: e.target.value }))}
                  placeholder="e.g., Cotton, Silk, Polyester"
                  fullWidth
                />

                <TextField
                  id="editItemSpecialFeatures"
                  label="Special Features"
                  value={editingItem.editSpecialFeatures}
                  onChange={(e) => setEditingItem(prev => ({ ...prev, editSpecialFeatures: e.target.value }))}
                  placeholder="e.g., Handmade, Embroidered, Washable"
                  fullWidth
                />

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Item Image (Max size: 5MB, auto-compressed)
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={editImageProcessing ? <CircularProgress size={16} /> : <ImageIcon />}
                      disabled={editImageProcessing}
                    >
                      {editImageProcessing ? 'Processing...' : 'Upload Image'}
                      <input
                        id="editItemImage"
                        type="file"
                        accept="image/*"
                        onChange={handleEditImageChange}
                        hidden
                      />
                    </Button>
                    {editingItem.editImagePreview && (
                      <Box sx={{ position: 'relative', display: 'inline-block' }}>
                        <Box
                          component="img"
                          src={editingItem.editImagePreview}
                          alt="Preview"
                          sx={{ 
                            width: 80, 
                            height: 80, 
                            objectFit: 'cover', 
                            borderRadius: 1,
                            border: '2px solid',
                            borderColor: 'grey.300',
                          }}
                        />
                        <IconButton
                          size="small"
                          onClick={clearEditImage}
                          sx={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            bgcolor: 'error.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'error.dark' },
                          }}
                          aria-label="Remove image"
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                </Box>
                
                {error && (
                  <Alert severity="error">
                    {error}
                  </Alert>
                )}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeEditModal} color="inherit">
            Cancel
          </Button>
          <Button 
            type="submit"
            form="edit-item-form"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

export default ItemPanel;
