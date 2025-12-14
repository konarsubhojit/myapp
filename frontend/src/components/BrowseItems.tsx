import { useState, useCallback, type ReactElement, type ChangeEvent, type FormEvent } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid2'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import CloseIcon from '@mui/icons-material/Close'
import { deleteItem, updateItem } from '../services/api'
import { useCurrency } from '../contexts/CurrencyContext'
import { useNotification } from '../contexts/NotificationContext'
import { useItemsData } from '../hooks/useItemsData'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { useImageProcessing } from '../hooks/useImageProcessing'
import ItemCard from './common/ItemCard'
import ItemCardSkeleton from './common/ItemCardSkeleton'
import ImageUploadField from './common/ImageUploadField'
import type { Item, ItemId } from '../types'

interface BrowseItemsProps {
  onItemsChange: () => void
  onCopyItem?: (item: Item) => void
  onEditItem?: (item: Item) => void
}

interface EditingItemState extends Item {
  editName: string
  editPrice: string
  editColor: string
  editFabric: string
  editSpecialFeatures: string
  removeImage: boolean
}

function BrowseItems({ onItemsChange, onCopyItem, onEditItem }: BrowseItemsProps): ReactElement {
  const { formatPrice } = useCurrency()
  const { showSuccess, showError } = useNotification()
  const [error, setError] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  // Edit mode state
  const [editingItem, setEditingItem] = useState<EditingItemState | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  // Use image processing hook for edit form
  const {
    image: editImage,
    imagePreview: editImagePreview,
    imageProcessing: editImageProcessing,
    imageError: editImageError,
    setImage: setEditImage,
    setImagePreview: setEditImagePreview,
    handleImageChange: handleEditImageChangeRaw,
    clearImage: clearEditImage,
  } = useImageProcessing(showSuccess)

  // Use items data hook with infinite scroll
  const {
    items,
    loading,
    loadingMore,
    hasMore,
    search,
    searchInput,
    setSearchInput,
    handleSearch,
    clearSearch,
    loadMore,
    fetchItems,
  } = useItemsData()

  // Infinite scroll observer
  const loadMoreRef = useInfiniteScroll({
    onLoadMore: loadMore,
    loading: loadingMore,
    hasMore,
  })

  const handleDelete = useCallback(async (id: ItemId, itemName: string) => {
    if (!globalThis.confirm(`Are you sure you want to delete "${itemName}"? This item can be restored later.`)) {
      return
    }
    try {
      await deleteItem(id)
      onItemsChange()
      fetchItems()
      showSuccess(`Item "${itemName}" has been deleted.`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete item'
      setError(errorMessage)
      showError(errorMessage)
    }
  }, [onItemsChange, fetchItems, showSuccess, showError])

  const handleCopy = useCallback((item: Item) => {
    if (onCopyItem) {
      onCopyItem(item)
    }
  }, [onCopyItem])

  const handleEdit = useCallback((item: Item) => {
    // Use built-in edit dialog instead of external handler
    setEditingItem({
      ...item,
      editName: item.name,
      editPrice: String(item.price),
      editColor: item.color || '',
      editFabric: item.fabric || '',
      editSpecialFeatures: item.specialFeatures || '',
      removeImage: false
    })
    setEditImage('')
    setEditImagePreview(item.imageUrl || '')
    setShowEditModal(true)
  }, [setEditImage, setEditImagePreview])

  const handleEditImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await handleEditImageChangeRaw(file)
    setEditingItem(prev => prev ? ({
      ...prev,
      removeImage: false
    }) : null)
  }

  const clearEditImageWrapper = () => {
    clearEditImage()
    setEditingItem(prev => prev ? ({
      ...prev,
      removeImage: true
    }) : null)
    const fileInput = document.getElementById('editItemImage') as HTMLInputElement | null
    if (fileInput) fileInput.value = ''
  }

  const handleEditSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (!editingItem?.editName.trim() || !editingItem?.editPrice) {
      setError('Please fill in name and price')
      return
    }

    const priceNum = Number.parseFloat(editingItem.editPrice)
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setError('Please enter a valid price')
      return
    }

    setEditLoading(true)
    try {
      const updateData: {
        name: string
        price: number
        color: string
        fabric: string
        specialFeatures: string
        image?: string | null
      } = {
        name: editingItem.editName.trim(),
        price: priceNum,
        color: editingItem.editColor.trim(),
        fabric: editingItem.editFabric.trim(),
        specialFeatures: editingItem.editSpecialFeatures.trim()
      }

      // Handle image changes
      if (editImage) {
        updateData.image = editImage
      } else if (editingItem.removeImage) {
        updateData.image = null
      }

      const itemName = editingItem.editName.trim()
      await updateItem(editingItem._id, updateData)
      setShowEditModal(false)
      setEditingItem(null)
      onItemsChange()
      fetchItems()
      showSuccess(`Item "${itemName}" has been updated.`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update item'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setEditLoading(false)
    }
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setEditingItem(null)
    setError('')
  }

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" component="h2" gutterBottom fontWeight={600}>
        Browse Items
      </Typography>

      {/* Search */}
      <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
        <TextField
          size="small"
          placeholder="Search by name, color, fabric..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
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
        {search && (
          <Button
            type="button"
            variant="outlined"
            size="small"
            onClick={clearSearch}
            startIcon={<ClearIcon />}
          >
            Clear
          </Button>
        )}
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && items.length === 0 && (
        <Typography color="text.secondary" textAlign="center" py={4}>
          No items found
        </Typography>
      )}

      {!loading && items.length > 0 && (
        <>
          <Grid container spacing={2}>
            {items.map((item) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item._id}>
                <ItemCard
                  item={item}
                  formatPrice={formatPrice}
                  onCopy={handleCopy}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </Grid>
            ))}

            {/* Loading skeletons while fetching more items */}
            {loadingMore && Array.from({ length: 3 }).map((_, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={`skeleton-${index}`}>
                <ItemCardSkeleton />
              </Grid>
            ))}
          </Grid>

          {/* Infinite scroll trigger element */}
          <div ref={loadMoreRef} style={{ height: '20px', margin: '20px 0' }} />

          {/* Show message when all items are loaded */}
          {!hasMore && !loadingMore && items.length > 0 && (
            <Typography color="text.secondary" textAlign="center" py={2}>
              All items loaded
            </Typography>
          )}
        </>
      )}
      
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
                  onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, editName: e.target.value }) : null)}
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
                  onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, editPrice: e.target.value }) : null)}
                  placeholder="Enter price"
                  fullWidth
                  required
                />

                <TextField
                  id="editItemColor"
                  label="Color"
                  value={editingItem.editColor}
                  onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, editColor: e.target.value }) : null)}
                  placeholder="e.g., Red, Blue, Multi-color"
                  fullWidth
                />

                <TextField
                  id="editItemFabric"
                  label="Fabric"
                  value={editingItem.editFabric}
                  onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, editFabric: e.target.value }) : null)}
                  placeholder="e.g., Cotton, Silk, Polyester"
                  fullWidth
                />

                <TextField
                  id="editItemSpecialFeatures"
                  label="Special Features"
                  value={editingItem.editSpecialFeatures}
                  onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, editSpecialFeatures: e.target.value }) : null)}
                  placeholder="e.g., Handmade, Embroidered, Washable"
                  fullWidth
                />

                <Box>
                  <ImageUploadField
                    id="editItemImage"
                    imagePreview={editImagePreview}
                    imageProcessing={editImageProcessing}
                    onImageChange={handleEditImageChange}
                    onClearImage={clearEditImageWrapper}
                  />
                </Box>
                
                {(error || editImageError) && (
                  <Alert severity="error">
                    {error || editImageError}
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
            disabled={editLoading || editImageProcessing}
            startIcon={editLoading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {editLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}

export default BrowseItems
