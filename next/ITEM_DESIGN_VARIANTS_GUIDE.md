# Item Design Variants Feature

## Overview
This feature allows users to manage multiple design variants for the same item. This is useful when an item has the same base properties (name, color, fabric) but comes in different visual designs that customers can choose from.

## Use Case
For example, a "Embroidered Kurta" in "Red" color made of "Silk" fabric might come in 3 different embroidery patterns. Instead of creating 3 separate items, you can now:
1. Create one item for "Embroidered Kurta - Red - Silk"
2. Upload multiple design images showing different embroidery patterns
3. When creating an order, customers can select which specific design they want

## Database Changes

### New Table: `item_designs`
Stores multiple design variants for each item.

```sql
CREATE TABLE item_designs (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  design_name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false NOT NULL,
  display_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX item_designs_item_id_idx ON item_designs(item_id);
CREATE INDEX item_designs_is_primary_idx ON item_designs(is_primary);
```

### Updated Table: `order_items`
Added `design_id` column to track which design variant was selected for each order item.

```sql
ALTER TABLE order_items ADD COLUMN design_id INTEGER REFERENCES item_designs(id);
```

## API Endpoints

### GET /api/items/:id/designs
Get all design variants for a specific item.

**Response:**
```json
[
  {
    "id": 1,
    "_id": 1,
    "itemId": 123,
    "designName": "Floral Pattern",
    "imageUrl": "https://...",
    "isPrimary": true,
    "displayOrder": 0,
    "createdAt": "2025-12-19T00:00:00.000Z"
  }
]
```

### POST /api/items/:id/designs
Add a new design variant to an item.

**Request Body:**
```json
{
  "designName": "Geometric Pattern",
  "image": "data:image/jpeg;base64,...",
  "isPrimary": false,
  "displayOrder": 1
}
```

**Response:**
```json
{
  "id": 2,
  "_id": 2,
  "itemId": 123,
  "designName": "Geometric Pattern",
  "imageUrl": "https://...",
  "isPrimary": false,
  "displayOrder": 1,
  "createdAt": "2025-12-19T00:00:00.000Z"
}
```

## UI Components

### 1. MultipleDesignUpload Component
**Location:** `next/components/items/MultipleDesignUpload.tsx`

**Features:**
- Upload multiple design images with compression
- Add custom names for each design
- Mark one design as primary
- Delete individual designs
- Visual preview grid
- Drag-and-drop support (future enhancement)

**Usage in CreateItem:**
```tsx
<MultipleDesignUpload
  designs={designs}
  onDesignsChange={setDesigns}
  onProcessing={setDesignProcessing}
/>
```

### 2. DesignPicker Component
**Location:** `next/components/orders/DesignPicker.tsx`

**Features:**
- Visual thumbnail grid of all design variants
- Selection indicator for chosen design
- Primary design indicator
- Auto-selects primary design by default
- Responsive grid layout

**Usage in OrderForm:**
```tsx
{selectedItem.designs && selectedItem.designs.length > 0 && (
  <DesignPicker
    designs={selectedItem.designs}
    selectedDesignId={orderItem.designId}
    onDesignSelect={(designId) => handleItemChange(index, 'designId', designId)}
  />
)}
```

## User Workflow

### Creating an Item with Design Variants

1. Navigate to "Create Item" page
2. Fill in basic item details (name, price, color, fabric, special features)
3. Optionally upload a main image (fallback)
4. In the "Design Variants" section:
   - Click "Add Design" to upload first design
   - Image is automatically compressed
   - Give the design a descriptive name (e.g., "Floral Pattern")
   - First design is automatically marked as primary
5. Add more designs by clicking "Add Design" again
6. Set a different design as primary by clicking "Set Primary" if needed
7. Submit the form to create the item with all designs

### Creating an Order with Design Selection

1. Navigate to "Create Order" page
2. Fill in customer details
3. Add an item to the order
4. Select the item from the dropdown
5. If the item has design variants:
   - A design picker grid appears automatically
   - Primary design is pre-selected
   - Click on any design thumbnail to select it
   - Selected design is highlighted with a blue border and checkmark
6. Fill in quantity and customization notes
7. Submit the order

## Technical Implementation Details

### Image Upload and Storage
- Images are uploaded to Vercel Blob Storage
- Automatic compression using `browser-image-compression` library
- Maximum file size: 5MB (before compression)
- Images compressed to max 1MB, max 1920px dimension
- Storage path: `items/{itemId}/designs/{timestamp}-{random}.{extension}`

### Data Loading Optimization
- Item designs are loaded in bulk to avoid N+1 queries
- When fetching items, all designs are loaded in a single query using `inArray`
- Designs are grouped by itemId in memory
- Primary design sorting is handled by database ORDER BY

### Type Safety
- Full TypeScript support with strict types
- New interface: `ItemDesign` in `types/entities.ts`
- Updated interfaces: `Item`, `OrderItem`, `CreateOrderItemData`
- Proper type guards in OrderForm component

## Migration Instructions

To apply the database schema changes:

1. Connect to your Neon PostgreSQL database
2. Run the migration file: `backend/db/migrations/0006_add_item_designs.sql`
3. The migration will:
   - Create the `item_designs` table
   - Add `design_id` column to `order_items`
   - Migrate existing item images to design variants (marked as "Default Design")

```bash
# Example using psql
psql $NEON_DATABASE_URL -f backend/db/migrations/0006_add_item_designs.sql
```

## Future Enhancements

### Planned Features
1. **Drag-and-drop reordering** of designs based on `display_order`
2. **Bulk upload** multiple designs at once
3. **Design deletion** from existing items
4. **Display in BrowseItems** - Show design thumbnails in item cards
5. **Display in OrderDetails** - Show which design was selected
6. **Design templates** - Save and reuse common designs

### Potential Improvements
- Add design categories or tags
- Support for design variants with different prices
- Customer favorites/bookmarks for designs
- Design preview zoom/lightbox
- Multiple images per design variant
- 3D model support for designs

## Testing Checklist

- [ ] Create item with single design
- [ ] Create item with multiple designs
- [ ] Set different designs as primary
- [ ] Create order selecting default design
- [ ] Create order selecting non-primary design
- [ ] Create order for item with no designs (fallback to main image)
- [ ] Update existing item to add designs
- [ ] Verify design images display correctly
- [ ] Test image compression for large files
- [ ] Verify designId is saved in order_items table
- [ ] Test pagination with items having designs

## Troubleshooting

### Images not uploading
- Check `BLOB_READ_WRITE_TOKEN` environment variable is set
- Verify Vercel Blob Storage is configured correctly
- Check browser console for compression errors

### Designs not showing in order form
- Verify item has designs in database
- Check `item_designs` table has records
- Ensure Item model is properly loading designs

### Type errors in TypeScript
- Run `npm run build` to check for compilation errors
- Ensure all type imports are correct
- Check Next.js version compatibility (requires 16+)

## Support

For issues or questions, please refer to:
- API Documentation: `next/API_DOCUMENTATION.md`
- Project README: `next/README.md`
- Database Schema: `backend/db/schema.js`
