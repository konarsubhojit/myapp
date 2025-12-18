# Performance Optimizations

This document describes the performance optimizations implemented in the Order Management System.

## Backend Optimizations

### 1. N+1 Query Prevention

**Problem**: When fetching orders with their items, the naive approach would make one query for orders, then N additional queries (one per order) to fetch items.

**Solution**: Implemented bulk fetching using `inArray` to fetch all order items in a single query.

**Impact**: 
- For 100 orders: Reduced from 101 queries to 2 queries (98% reduction)
- Applies to: `Order.find()`, `Order.findPaginated()`, `Order.findCursorPaginated()`, `Order.findPriorityOrders()`

**Code Location**: `backend/models/Order.js`

```javascript
// Bulk fetch all order items in ONE query instead of N queries
const orderIds = ordersResult.map(o => o.id);
const allItems = await db.select()
  .from(orderItems)
  .where(inArray(orderItems.orderId, orderIds));
```

### 2. Bulk Item Fetching

**Problem**: When creating orders, items were fetched one at a time leading to N queries.

**Solution**: Implemented `Item.findByIds()` to fetch multiple items in a single query.

**Impact**: Reduces database round trips from O(n) to O(1) for n items

**Code Location**: `backend/models/Item.js`

### 3. Cache Invalidation Optimization

**Problem**: Routes were invalidating cache twice per operation (before AND after), causing unnecessary Redis calls.

**Solution**: Removed "before" invalidations, keeping only "after" invalidations.

**Impact**: 
- Reduced Redis operations by 50% per create/update/delete operation
- Example: Item creation went from 2 Redis INCR calls to 1

**Code Locations**:
- `backend/routes/items.js` (POST, PUT, DELETE, restore endpoints)
- `backend/routes/orders.js` (POST, PUT endpoints)

**Before**:
```javascript
await invalidateItemCache();  // Before operation
const newItem = await Item.create(data);
await invalidateItemCache();  // After operation
```

**After**:
```javascript
const newItem = await Item.create(data);
await invalidateItemCache();  // Only after operation
```

### 4. Redis Caching with Request Coalescing

**Problem**: Multiple simultaneous requests for the same data would all hit the database (cache stampede).

**Solution**: Implemented request coalescing where the first request fetches data while subsequent identical requests wait for the result.

**Impact**: Prevents cache stampede, reduces database load during traffic bursts

**Code Location**: `backend/middleware/cache.js`

### 5. Cache Version Memoization

**Problem**: Every cached request requires a Redis GET to fetch the cache version.

**Solution**: Memoize cache versions in-memory for 200ms to reduce Redis calls.

**Impact**: 
- Reduces Redis GET calls during burst traffic
- Tradeoff: 200ms window where instances may serve slightly stale data
- Configurable via `VERSION_MEMO_TTL_MS`

**Code Location**: `backend/middleware/cache.js`

## Frontend Optimizations

### 1. Memoized Calculations

**Problem**: Expensive calculations (e.g., order total) were recomputed on every render.

**Solution**: Used `useMemo` to cache calculated values between renders.

**Impact**: Prevents unnecessary recalculation when dependencies haven't changed

**Code Location**: `frontend/src/components/OrderForm.tsx`

```typescript
// PERFORMANCE OPTIMIZATION: Memoize total calculation
const totalPrice = useMemo(() => {
  return orderItems.reduce((total, orderItem) => {
    const item = items.find((i) => String(i._id) === String(orderItem.itemId));
    const qty = typeof orderItem.quantity === 'number' ? orderItem.quantity : parseInt(String(orderItem.quantity), 10);
    if (item && !Number.isNaN(qty) && qty > 0) {
      return total + item.price * qty;
    }
    return total;
  }, 0);
}, [orderItems, items]);
```

### 2. Memoized Event Handlers

**Problem**: Creating new function instances on every render causes child components to re-render unnecessarily.

**Solution**: Used `useCallback` to memoize event handler functions.

**Impact**: Prevents unnecessary re-renders of child components receiving these callbacks as props

**Code Locations**: 
- `frontend/src/components/OrderForm.tsx`
- `frontend/src/components/ItemPanel.tsx`

```typescript
// PERFORMANCE OPTIMIZATION: Memoize callbacks to prevent re-renders
const handleDelete = useCallback(async (id: ItemId, itemName: string) => {
  // ... implementation
}, [dependencies]);
```

### 3. Backend-Computed Analytics

**Problem**: Sales analytics were computed client-side, processing potentially large datasets.

**Solution**: Moved analytics computation to backend with caching.

**Impact**: 
- Reduced client-side processing
- Results are cached on backend for 60 seconds
- Faster page load for sales reports

**Code Locations**:
- Backend: `backend/services/analyticsService.js`, `backend/routes/analytics.js`
- Frontend: `frontend/src/hooks/useSalesAnalyticsOptimized.ts`

## Database Optimizations

### 1. Cursor-Based Pagination

**Problem**: Offset-based pagination (LIMIT/OFFSET) gets slower as offset increases.

**Solution**: Implemented cursor-based pagination using composite keys (createdAt, id).

**Impact**: 
- Consistent query performance regardless of page depth
- Better for infinite scroll UIs

**Code Location**: `backend/models/Item.js`, `backend/models/Order.js`

### 2. Composite Indexes

**Problem**: Cursor pagination requires efficient ordering by multiple columns.

**Solution**: Database schema includes composite indexes on (createdAt DESC, id DESC).

**Impact**: Fast keyset pagination queries

**Code Location**: `backend/db/schema.js`

## Measurement & Monitoring

### Performance Metrics

- **Backend Tests**: 452 tests passing
- **Frontend Tests**: 468 tests passing
- **Database Query Count**: Reduced by ~98% for order listings
- **Redis Operations**: Reduced by ~50% for write operations

### Recommended Monitoring

1. **Database Query Time**: Monitor slow queries (>100ms)
2. **Cache Hit Rate**: Target >80% hit rate for read endpoints
3. **Redis Connection Pool**: Monitor for connection exhaustion
4. **API Response Times**: 
   - GET endpoints: <100ms (cached), <500ms (uncached)
   - POST/PUT endpoints: <500ms

## Future Optimization Opportunities

1. **Database Query Optimization**
   - Add index on `orders.expectedDeliveryDate` for priority queries
   - Consider materialized views for analytics

2. **Frontend**
   - Implement virtual scrolling for very large lists
   - Add React.memo to pure components
   - Consider code splitting for large components

3. **Caching**
   - Implement cache warming for frequently accessed data
   - Add CDN caching for static assets
   - Consider Redis cluster for horizontal scaling

4. **API**
   - Implement GraphQL for selective field fetching
   - Add compression middleware (gzip/brotli)
   - Implement rate limiting per user/IP
