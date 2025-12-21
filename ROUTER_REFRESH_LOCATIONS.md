# Router Refresh Call Locations

## Summary of All router.refresh() Implementations

This document lists all locations where `router.refresh()` is called to ensure data consistency after inventory mutations.

## Page-Level router.refresh() Calls

### Item Pages (4 locations)

1. **`/items/browse/page.tsx`**
   - Location: `handleItemsChange` callback
   - Trigger: When items are deleted from browse view
   - Line: `router.refresh();`

2. **`/items/create/page.tsx`**
   - Location: `handleItemCreated` callback
   - Trigger: After successfully creating a new item
   - Line: `router.refresh();`

3. **`/items/deleted/page.tsx`**
   - Location: `handleItemsChange` callback
   - Trigger: When items are restored or permanently deleted
   - Line: `router.refresh();`

4. **`/items/[id]/page.tsx`**
   - Location: `handleItemUpdated` callback
   - Trigger: After updating item details or designs
   - Line: `router.refresh();`

### Dashboard (2 locations)

5. **`/dashboard/DashboardContent.tsx`** (Order Creation)
   - Location: `handleOrderCreated` callback
   - Trigger: After successfully creating an order
   - Line: `router.refresh();`

6. **`/dashboard/DashboardContent.tsx`** (Item Changes)
   - Location: `handleItemsChange` callback
   - Trigger: When items are modified in browse view
   - Line: `router.refresh();`

### Order Pages (1 location - already implemented)

7. **`/orders/create/page.tsx`**
   - Location: `handleOrderCreated` callback
   - Trigger: After successfully creating an order
   - Line: `router.refresh();`

## Component-Level onItemUpdated() Calls

These calls propagate up to page-level router.refresh() calls:

### Design Operations (3 locations)

1. **`components/items/ItemDetailsPage.tsx`** (Design Delete)
   - Location: `handleDesignDelete` function
   - Trigger: After successfully deleting a design
   - Line: `onItemUpdated();`

2. **`components/items/ItemDetailsPage.tsx`** (Set Primary Design)
   - Location: `handleDesignPrimary` function
   - Trigger: After setting a design as primary
   - Line: `onItemUpdated();`

3. **`components/items/ItemDetailsPage.tsx`** (Upload Designs)
   - Location: `handleSaveClick` function
   - Trigger: After uploading new designs
   - Line: `onItemUpdated();`

## Coverage Matrix

| Operation | Page/Component | Callback Chain | router.refresh() Location |
|-----------|----------------|----------------|---------------------------|
| Create Item | `/items/create` | `onItemCreated` → `handleItemCreated` | `/items/create/page.tsx` |
| Update Item | `/items/[id]` | `onItemUpdated` → `handleItemUpdated` | `/items/[id]/page.tsx` |
| Delete Item | `/items/browse` | `onItemsChange` → `handleItemsChange` | `/items/browse/page.tsx` |
| Restore Item | `/items/deleted` | `onItemsChange` → `handleItemsChange` | `/items/deleted/page.tsx` |
| Permanent Delete | `/items/deleted` | `onItemsChange` → `handleItemsChange` | `/items/deleted/page.tsx` |
| Upload Design | `/items/[id]` | `onItemUpdated` → `handleItemUpdated` | `/items/[id]/page.tsx` |
| Delete Design | `/items/[id]` | `onItemUpdated` → `handleItemUpdated` | `/items/[id]/page.tsx` |
| Set Primary Design | `/items/[id]` | `onItemUpdated` → `handleItemUpdated` | `/items/[id]/page.tsx` |
| Create Order | `/orders/create` | `onOrderCreated` → `handleOrderCreated` | `/orders/create/page.tsx` |
| Update Order | `/orders/history` | Direct `fetchOrders()` call | (No refresh needed) |
| Dashboard - Create Order | `/dashboard` | `onOrderCreated` → `handleOrderCreated` | `/dashboard/DashboardContent.tsx` |
| Dashboard - Item Changes | `/dashboard` | `onItemsChange` → `handleItemsChange` | `/dashboard/DashboardContent.tsx` |

## API Routes with Cache Invalidation

All these API routes call cache invalidation before returning:

### Items
- `POST /api/items` → `invalidateItemCache()`
- `PUT /api/items/:id` → `invalidateItemCache()`
- `DELETE /api/items/:id` → `invalidateItemCache()`
- `POST /api/items/:id/restore` → `invalidateItemCache()`

### Designs
- `POST /api/items/:id/designs` → `invalidateItemCache()`
- `PUT /api/items/:id/designs/:designId` → `invalidateItemCache()`
- `DELETE /api/items/:id/designs/:designId` → `invalidateItemCache()`

### Orders
- `POST /api/orders` → `invalidateOrderCache()`
- `PUT /api/orders/:id` → `invalidateOrderCache()`

## Testing Scenarios

Use these scenarios to verify proper refresh behavior:

### Item Operations
1. ✅ Create item → Browse page shows new item
2. ✅ Update item → Item details show updated values
3. ✅ Delete item → Browse page removes item
4. ✅ Restore item → Browse page shows restored item
5. ✅ Upload design → Item details show new design
6. ✅ Delete design → Item details removes design
7. ✅ Set primary design → Item details shows correct primary

### Order Operations
8. ✅ Create order → Order history shows new order
9. ✅ Update order → Order details show updated values
10. ✅ Create order (dashboard) → Dashboard refreshes data

### Dashboard Operations
11. ✅ Delete item (dashboard) → Items list updates
12. ✅ Create order (dashboard) → Orders list updates

## Implementation Notes

1. **Callback Pattern**: All mutations use a callback pattern where components call parent callbacks (e.g., `onItemCreated`, `onItemUpdated`) which eventually call `router.refresh()`

2. **Design Operations**: Design operations are special because they happen within the item details page and must propagate up via `onItemUpdated()` callback

3. **Order History**: The order history page uses a direct `fetchOrders()` call rather than `router.refresh()` because it manages its own data fetching

4. **Cache Version Bumping**: Server-side cache invalidation uses Redis version bumping, which is more efficient than SCAN-based invalidation

5. **Dual Refresh**: Some operations trigger refresh in both dashboard and dedicated pages (e.g., creating an order can happen in `/orders/create` or in `/dashboard`)

## Maintenance

When adding new inventory operations:

1. Add cache invalidation call in API route (`invalidateItemCache()` or `invalidateOrderCache()`)
2. Add callback to component props (e.g., `onItemCreated`, `onItemUpdated`)
3. Call callback after successful mutation in component
4. Add `router.refresh()` call in page-level callback handler
5. Update this documentation with the new operation

## Related Files

- Implementation details: `/ROUTER_REFRESH_IMPLEMENTATION.md`
- Cache strategy: `/next/CACHE_FIX_SUMMARY.md`
- API documentation: `/next/API_DOCUMENTATION.md`
