# Permanent Delete Design

## Problem Statement

When items are soft-deleted (marked with a `deletedAt` timestamp), we need a way to permanently remove their images from blob storage to save costs and free up space. However, we must preserve the item records because historical orders reference these items.

## Solution

We implemented a **permanent image deletion** feature that:
1. Removes the image from Vercel Blob Storage
2. Clears the `imageUrl` field from the item record
3. Keeps the item record intact for historical order references

## Design Decisions

### Why Not Hard Delete?

Hard deleting (removing the entire record) would break historical orders because:
- `order_items` table has a foreign key reference to `items.id`
- Old orders would lose critical information about what items were sold
- Sales reports and order history would be incomplete

### Why Keep the Item Record?

The item record contains important information:
- Item name at the time of sale
- Price at the time of sale
- Product attributes (color, fabric, special features)
- This data is essential for:
  - Sales reports
  - Customer order history
  - Business analytics
  - Legal/tax records

### Why Remove Only the Image?

Images are the largest storage consumers:
- Images are stored in Vercel Blob Storage (costs money)
- Old product images may no longer be needed
- The item metadata (name, price, attributes) is sufficient for historical records

## Implementation

### Backend

**New Model Method** (`backend/models/Item.js`):
```javascript
async permanentlyRemoveImage(id) {
  const db = getDatabase();
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) return null;
  
  const result = await db.update(items)
    .set({ imageUrl: null })
    .where(eq(items.id, numericId))
    .returning();
  if (result.length === 0) return null;
  
  return transformItem(result[0]);
}
```

**New Route** (`backend/routes/items.js`):
```javascript
router.delete('/:id/permanent', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if item is soft deleted
    if (!item.deletedAt) {
      return res.status(400).json({ 
        message: 'Item must be soft deleted before permanent deletion' 
      });
    }

    const imageUrl = item.imageUrl;

    // Remove image from blob storage if it exists
    if (imageUrl) {
      try {
        await del(imageUrl);
        logger.info('Image deleted from blob storage', { url: imageUrl });
      } catch (deleteError) {
        logger.warn('Failed to delete image from blob storage', { 
          url: imageUrl, 
          error: deleteError.message 
        });
      }
    }

    // Clear the imageUrl from the item record
    await Item.permanentlyRemoveImage(req.params.id);
    
    logger.info('Item image permanently removed', { itemId: req.params.id });
    res.json({ message: 'Item image permanently removed' });
  } catch (error) {
    logger.error('Failed to permanently remove item image', error);
    res.status(500).json({ 
      message: 'Failed to permanently remove item image' 
    });
  }
});
```

### Frontend

**API Service** (`frontend/src/services/api.js`):
```javascript
export const permanentlyDeleteItem = async (id) => {
  const response = await authFetch(`${API_BASE_URL}/items/${id}/permanent`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to permanently delete item');
  }
  return response.json();
};
```

**UI Component** (`frontend/src/components/ItemPanel.jsx`):
- Added "Remove Image" button next to "Restore" button for deleted items
- Button is disabled if the item has no image
- Confirmation dialog warns users the action is permanent
- Success/error notifications inform users of the outcome

## User Workflow

1. User soft-deletes an item (DELETE /api/items/:id)
   - Item gets `deletedAt` timestamp
   - Item is hidden from active items list
   - Item appears in "Deleted Items" section
   - Image remains in blob storage

2. User opens "Show Deleted" section
   - Lists all soft-deleted items
   - Shows image thumbnail if available

3. User can either:
   - **Restore**: Removes `deletedAt`, item becomes active again
   - **Remove Image**: Permanently deletes image from blob storage
     - Only available for items with images
     - Shows confirmation dialog
     - Clears `imageUrl` field
     - Item record remains for historical orders

## Security Considerations

1. **Authorization**: Only authenticated users can permanently delete images
2. **Validation**: Endpoint verifies item is soft-deleted before allowing permanent deletion
3. **Error Handling**: Gracefully handles blob storage deletion failures
4. **Logging**: All actions are logged for audit purposes

## Testing Checklist

- [ ] Soft delete an item with an image
- [ ] Verify image still exists in blob storage
- [ ] Verify item appears in deleted items list with image
- [ ] Permanently delete the image
- [ ] Verify image is removed from blob storage
- [ ] Verify item record still exists in database
- [ ] Verify historical orders still display correctly
- [ ] Verify "Remove Image" button is disabled for items without images
- [ ] Verify confirmation dialog appears before deletion
- [ ] Test error handling when blob storage deletion fails

## Future Enhancements

1. **Batch Operations**: Allow removing images from multiple items at once
2. **Scheduled Cleanup**: Automatically remove images after X days of soft deletion
3. **Image Archive**: Move images to cheaper storage tier instead of deleting
4. **Undo Feature**: Keep image backup for X days after permanent deletion
