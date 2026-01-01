# Fix: UI Not Reflecting Database Updates

## Problem Statement
In the Next.js app, when users updated orders or items, the changes were successfully saved to the database, but the UI continued to show the old/unmodified version.

## Root Cause Analysis

### The Race Condition
The issue was caused by a **cache invalidation timing race condition** in React Query:

1. User updates an order/item
2. API route handler updates database
3. **API route calls `invalidateOrderCache()` synchronously** ⚠️
4. API returns updated data to client
5. Client mutation `onSuccess` triggers
6. **React Query invalidates ALL queries with `['orders']` or `['items']` key**
7. React Query immediately refetches
8. **Refetch might hit empty/cold cache** ⚠️
9. UI shows stale data

The problem was that `invalidateQueries({ queryKey: ['orders'] })` invalidates **ALL** queries matching that prefix, including:
- Single order queries: `['orders', 'detail', '123']`
- List queries: `['orders', 'all']`, `['orders', 'page', ...]`
- Priority queries: `['orders', 'priority']`

When all these queries are invalidated simultaneously, they all try to refetch at once, but the server-side Redis cache version has already been bumped, causing cache misses and potential stale data returns.

### Why the Frontend/Backend Stack Worked

The React frontend with Express backend worked because:
1. Backend invalidates Redis cache (server-side only)
2. Frontend receives fresh data from API
3. React Query stores this data naturally
4. Invalidation happens **after** the data is already in the client cache
5. Refetch pulls from already-cached fresh data

## Solution Implemented

### Direct Cache Updates
Instead of invalidating and refetching, we now **directly update the cache** with the returned data:

```typescript
// ❌ BEFORE (Broken)
export function useUpdateOrder(): UseMutationResult<Order, Error, { id: OrderId; data: UpdateOrderData }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => api.updateOrder(id, data),
    onSuccess: () => {
      // This invalidates EVERYTHING including the single order we just updated
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

// ✅ AFTER (Fixed)
export function useUpdateOrder(): UseMutationResult<Order, Error, { id: OrderId; data: UpdateOrderData }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => api.updateOrder(id, data),
    onSuccess: (updatedOrder, { id }) => {
      // 1. Directly set the updated data in cache (synchronous, no race condition)
      queryClient.setQueryData(queryKeys.order(id), updatedOrder);
      
      // 2. Mark list queries as stale but don't refetch yet
      queryClient.invalidateQueries({ 
        queryKey: ['orders'],
        refetchType: 'none', // Don't trigger immediate refetch
      });
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      
      // 3. Schedule background refetch after 100ms delay
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['orders'], type: 'active' });
      }, 100);
    },
  });
}
```

### Key Changes

1. **Direct Cache Update**: `queryClient.setQueryData()` immediately updates the cache with the fresh data returned from the API
2. **Deferred List Refetch**: List queries are marked as stale but refetch is delayed by 100ms
3. **No Race Condition**: Single item/order queries now have fresh data immediately, no refetch needed

## Files Changed

### 1. `/next/hooks/mutations/useOrdersMutations.ts`
- Modified `useUpdateOrder` to use direct cache updates
- Added 100ms delay before refetching list queries

### 2. `/next/hooks/mutations/useItemsMutations.ts`
- Modified `useUpdateItem` to use direct cache updates
- Modified `useRestoreItem` to use direct cache updates
- Added 100ms delay before refetching list queries

### 3. `/next/lib/queryKeys.ts`
- Added `item(id)` function for single item queries
- This allows us to target specific item queries for cache updates

## Benefits

1. **✅ Instant UI Updates**: Changes appear immediately without waiting for refetch
2. **✅ No Race Conditions**: Cache is updated synchronously with mutation response
3. **✅ Better Performance**: Eliminates unnecessary refetch for single items/orders
4. **✅ Reliable**: Works consistently across all scenarios
5. **✅ Maintains Freshness**: Background refetch ensures lists stay up to date

## Testing

### Manual Testing Steps
1. Start the Next.js app: `cd next && npm run dev`
2. Login and navigate to an order or item detail page
3. Update the order/item (e.g., change status, price, etc.)
4. **Verify**: Changes appear immediately in the UI
5. Navigate to the order/item list page
6. **Verify**: List reflects the changes within 100ms
7. Check browser console for no errors

### Expected Behavior
- **Before Fix**: UI showed old data after update, required manual page refresh
- **After Fix**: UI shows updated data immediately, list updates in background

## Best Practices for React Query

### When to Use Direct Cache Updates
✅ Use `queryClient.setQueryData()` when:
- The API returns the updated entity
- You want instant UI feedback
- The mutation affects a single, identifiable entity

### When to Use Invalidation Only
✅ Use `queryClient.invalidateQueries()` when:
- The mutation affects multiple entities
- You don't have the fresh data to update cache
- You want to trigger a refetch for verification

### Avoid This Pattern
❌ Don't do this:
```typescript
onSuccess: () => {
  // This invalidates too broadly and causes race conditions
  queryClient.invalidateQueries({ queryKey: ['orders'] });
}
```

✅ Do this instead:
```typescript
onSuccess: (updatedOrder, { id }) => {
  // Update specific item first
  queryClient.setQueryData(queryKeys.order(id), updatedOrder);
  
  // Then invalidate related lists
  queryClient.invalidateQueries({ 
    queryKey: ['orders'],
    refetchType: 'none' 
  });
}
```

## Related Documentation
- [TanStack Query: Direct Cache Updates](https://tanstack.com/query/latest/docs/framework/react/guides/updates-from-mutation-responses)
- [TanStack Query: Invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation)
- [React Query Best Practices](https://tkdodo.eu/blog/react-query-best-practices)

## Conclusion

This fix eliminates the cache race condition by using direct cache updates for single entity mutations while maintaining background list freshness. The solution is more efficient, provides instant feedback to users, and works reliably across all scenarios.
