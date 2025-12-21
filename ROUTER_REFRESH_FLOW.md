# Data Refresh Flow Diagram

## Overview

This document provides visual representations of how data refresh works in the Next.js app after inventory changes.

## Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           User Action                                        │
│  (Create/Update/Delete Item, Order, or Design)                             │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Client-Side Component                                  │
│  • CreateItem.tsx           • ItemDetailsPage.tsx                           │
│  • BrowseItems.tsx          • OrderForm.tsx                                 │
│  • ManageDeletedItems.tsx   • OrderDetails.tsx                              │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          API Call                                            │
│  fetch('/api/items', { method: 'POST', ... })                               │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Server-Side API Route                                  │
│  • /api/items/route.ts      • /api/items/[id]/route.ts                     │
│  • /api/orders/route.ts     • /api/items/[id]/designs/route.ts             │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Database Operation                                      │
│  • Item.create(...)         • Order.update(...)                             │
│  • Item.delete(...)         • ItemDesign.create(...)                        │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Cache Invalidation                                        │
│  await invalidateItemCache()     ┌──────────────────────────────────┐      │
│  await invalidateOrderCache()    │ Redis Cache Version Bump         │      │
│                                   │ ITEMS: v1 → v2                   │      │
│                                   │ ORDERS: v1 → v2                  │      │
│                                   └──────────────────────────────────┘      │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Response to Client                                     │
│  return NextResponse.json(item, { status: 201 })                            │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Component Success Handler                               │
│  • onItemCreated()          • onItemUpdated()                               │
│  • onItemsChange()          • onOrderCreated()                              │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Page-Level Callback                                     │
│  const handleItemCreated = () => {                                          │
│    router.refresh();                                                        │
│    router.push('/items/browse');                                            │
│  }                                                                           │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       router.refresh()                                       │
│  • Triggers Next.js to re-fetch server data                                 │
│  • Uses new cache version (v2)                                              │
│  • Old cached data (v1) is ignored                                          │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Fresh Data Fetch                                         │
│  GET /api/items?page=1&limit=10                                             │
│  Cache Key: v2:GET:/api/items?page=1&limit=10                               │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Updated UI Display                                        │
│  User sees latest data immediately                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Example: Creating an Item

```
┌──────────────────────┐
│   User fills form    │
│   and clicks submit  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  CreateItem.tsx      │
│  handleSubmit()      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  createItem(data)    │
│  API Call            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ POST /api/items      │
│ Server Route         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Item.create(...)    │
│  Database Insert     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ invalidateItemCache()│
│ Redis: ITEMS v1→v2   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Return item JSON     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  onItemCreated()     │
│  Component Callback  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ handleItemCreated()  │
│ /items/create/page   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  router.refresh()    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Re-fetch with v2     │
│ GET /api/items       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Navigate to         │
│  /items/browse       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Show new item       │
│  in the list         │
└──────────────────────┘
```

## Example: Deleting a Design

```
┌──────────────────────┐
│  User clicks delete  │
│  on a design         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────┐
│  ItemDetailsPage.tsx             │
│  handleDesignDelete(designId)    │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  DELETE /api/items/:id/designs   │
│  /:designId                       │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  ItemDesign.delete(designId)     │
│  Database Delete                  │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  invalidateItemCache()            │
│  Redis: ITEMS v2→v3               │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Return success                   │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  onItemUpdated()                  │
│  Component Callback               │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  handleItemUpdated()              │
│  /items/[id]/page.tsx             │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  router.refresh()                 │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Re-fetch item with v3            │
│  GET /api/items/:id               │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Design removed from display      │
└──────────────────────────────────┘
```

## Cache Version Flow

```
Initial State:
┌────────────────────────────────────────┐
│ Redis Cache                            │
│ ITEMS version: 1                       │
│                                        │
│ Cached entries:                        │
│ v1:GET:/api/items → [item1, item2]    │
│ v1:GET:/api/items/1 → {item1 details} │
└────────────────────────────────────────┘

After Item Creation:
┌────────────────────────────────────────┐
│ Redis Cache                            │
│ ITEMS version: 2 ← Version bumped!     │
│                                        │
│ Cached entries:                        │
│ v1:GET:/api/items → [item1, item2]    │ ← Stale (ignored)
│ v1:GET:/api/items/1 → {item1 details} │ ← Stale (ignored)
│                                        │
│ New entries on next fetch:             │
│ v2:GET:/api/items → [item1, item2, 3] │ ← Fresh
└────────────────────────────────────────┘

After router.refresh():
┌────────────────────────────────────────┐
│ Next.js re-fetches with version 2      │
│                                        │
│ GET /api/items                         │
│ Cache Key: v2:GET:/api/items           │
│                                        │
│ Result: Fresh data with new item       │
└────────────────────────────────────────┘
```

## Component Hierarchy and Callback Propagation

```
Page Level (router.refresh())
    │
    ├── /items/browse/page.tsx
    │   └── handleItemsChange() → router.refresh()
    │       └── Called by: BrowseItems.onItemsChange
    │
    ├── /items/create/page.tsx
    │   └── handleItemCreated() → router.refresh()
    │       └── Called by: CreateItem.onItemCreated
    │
    ├── /items/deleted/page.tsx
    │   └── handleItemsChange() → router.refresh()
    │       └── Called by: ManageDeletedItems.onItemsChange
    │
    ├── /items/[id]/page.tsx
    │   └── handleItemUpdated() → router.refresh()
    │       └── Called by: ItemDetailsPage.onItemUpdated
    │           └── Triggered by:
    │               ├── useItemDetails.handleSave() (item update)
    │               ├── handleDesignDelete() (design delete)
    │               ├── handleDesignPrimary() (set primary)
    │               └── handleSaveClick() (upload designs)
    │
    ├── /orders/create/page.tsx
    │   └── handleOrderCreated() → router.refresh()
    │       └── Called by: OrderForm.onOrderCreated
    │
    └── /dashboard/DashboardContent.tsx
        ├── handleOrderCreated() → router.refresh()
        │   └── Called by: OrderForm.onOrderCreated
        │
        └── handleItemsChange() → router.refresh()
            └── Called by: BrowseItems/ManageDeletedItems.onItemsChange
```

## API Routes and Cache Invalidation

```
Items:
┌─────────────────────────────┐
│ POST   /api/items           │ → invalidateItemCache()
│ PUT    /api/items/:id       │ → invalidateItemCache()
│ DELETE /api/items/:id       │ → invalidateItemCache()
│ POST   /api/items/:id/restore │ → invalidateItemCache()
└─────────────────────────────┘

Designs:
┌────────────────────────────────────────┐
│ POST   /api/items/:id/designs          │ → invalidateItemCache()
│ PUT    /api/items/:id/designs/:designId│ → invalidateItemCache()
│ DELETE /api/items/:id/designs/:designId│ → invalidateItemCache()
└────────────────────────────────────────┘

Orders:
┌─────────────────────────────┐
│ POST /api/orders            │ → invalidateOrderCache()
│ PUT  /api/orders/:id        │ → invalidateOrderCache()
└─────────────────────────────┘
```

## Key Takeaways

1. **Version Bumping**: More efficient than deleting individual cache keys
2. **Callback Pattern**: Components → Page-level → router.refresh()
3. **Separation of Concerns**: API handles cache, pages handle refresh
4. **Consistency**: Same pattern used across all operations
5. **Performance**: Redis caching + version control = fast and consistent

## Related Documentation

- Implementation: `/ROUTER_REFRESH_IMPLEMENTATION.md`
- Locations: `/ROUTER_REFRESH_LOCATIONS.md`
- Cache Strategy: `/next/CACHE_FIX_SUMMARY.md`
