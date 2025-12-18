# Manual Verification Guide

This guide explains how to manually verify the bug fixes implemented in this PR.

## Prerequisites

1. Set up the backend environment variables in `backend/.env`:
   ```env
   NEON_DATABASE_URL=<your-postgres-connection-string>
   PORT=5000
   GOOGLE_CLIENT_ID=<your-google-client-id>
   BLOB_READ_WRITE_TOKEN=<your-vercel-blob-token>
   AUTH_DISABLED=true  # Optional: for testing without authentication
   ```

2. Set up the frontend environment variables in `frontend/.env`:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_GOOGLE_CLIENT_ID=<your-google-client-id>
   ```

3. Install dependencies:
   ```bash
   npm run install:all
   ```

4. Start the servers:
   ```bash
   # Terminal 1 - Backend
   npm run backend

   # Terminal 2 - Frontend  
   npm run frontend
   ```

## Test 1: Database Update Resilience (Item Update)

**What we fixed:** Item updates now retry on transient database failures.

**Steps to verify:**

1. Navigate to the Items page
2. Click "Edit" on any item
3. Change the item name or price
4. Click "Save"
5. **Expected Result:** Item updates successfully and the change is reflected immediately
6. Refresh the page
7. **Expected Result:** The updated item still shows the new values (confirming DB write succeeded)

**How to simulate a transient DB failure (advanced):**
- Temporarily disconnect your database or add a network delay
- Attempt to update an item
- Check backend logs for retry attempts
- The update should eventually succeed after retries

## Test 2: Database Update Resilience (Order Update)

**What we fixed:** Order updates now retry on transient database failures.

**Steps to verify:**

1. Navigate to Order History
2. Click on any order to view details
3. Click "Edit Order"
4. Change any field (e.g., customer name, status, or items)
5. Click "Update Order"
6. **Expected Result:** Order updates successfully
7. Navigate back to Order History
8. **Expected Result:** The updated order reflects the changes

## Test 3: Sales Report - Completed vs All Orders

**What we fixed:** "Completed Orders" filter now shows only completed orders, not all orders.

**Prerequisites:** 
- Create at least 2 orders with different statuses:
  - Order 1: status = "completed", total = $100
  - Order 2: status = "pending", total = $200

**Steps to verify:**

1. Navigate to Sales Report page
2. Select "Completed Orders" filter
3. **Expected Result:** 
   - Shows only Order 1 data
   - Total sales = $100
   - Order count = 1

4. Select "All Orders" filter
5. **Expected Result:**
   - Shows all orders data
   - Total sales = $300
   - Order count = 2

**Before the fix:** Both filters showed $300 and 2 orders

**After the fix:** Filters show different values based on order status

## Test 4: Order History Cache Consistency

**What we fixed:** Order history now has consistent caching behavior.

**Steps to verify:**

1. Navigate to Order History
2. Note the orders displayed
3. Create a new order via the "Create Order" page
4. Return to Order History immediately
5. **Expected Result:** New order may not appear yet (cache in effect)
6. Wait 60 seconds (cache TTL)
7. Refresh the Order History page
8. **Expected Result:** New order now appears in the list

**Alternate verification:**
1. Update an existing order
2. Return to Order History
3. If within 60 seconds, old data may show (acceptable)
4. After 60 seconds, updated data should appear

## Test 5: Order History Not Empty

**What we're verifying:** Order history displays orders correctly.

**Prerequisites:** Database has at least 1 order

**Steps to verify:**

1. Navigate to Order History page
2. **Expected Result:** 
   - Orders are displayed in a table
   - Each order shows: Order ID, Customer, Total, Status, Date, etc.
   - No "No orders found" message (unless database is truly empty)

3. Scroll down to load more orders (if many orders exist)
4. **Expected Result:** More orders load dynamically

**If order history is still empty:**
- Check browser console for errors
- Check backend logs for errors
- Verify database has orders: `SELECT COUNT(*) FROM orders;`
- Verify API response: `curl http://localhost:5000/api/orders/cursor?limit=10`

## Verification Checklist

Use this checklist to verify all fixes:

- [ ] Item updates work correctly and persist to database
- [ ] Order updates work correctly and persist to database
- [ ] Sales report "Completed Orders" shows only completed orders
- [ ] Sales report "All Orders" shows all orders regardless of status
- [ ] Order history displays orders (not empty)
- [ ] Order history cache refreshes after 60 seconds
- [ ] Backend logs show no errors during normal operations
- [ ] All tests pass: `cd backend && npm test`

## Troubleshooting

### Order History Still Shows Empty

1. **Check database connection:**
   ```bash
   # In backend terminal
   curl http://localhost:5000/api/health
   ```
   Should return: `{"status":"healthy"}`

2. **Check if orders exist:**
   - Use a database client to query: `SELECT * FROM orders LIMIT 10;`
   - Or use API: `curl http://localhost:5000/api/orders/all`

3. **Check browser console:**
   - Open DevTools (F12)
   - Look for network errors or API failures
   - Verify API calls are returning data

4. **Check authentication:**
   - If using Google OAuth, ensure you're logged in
   - Or set `AUTH_DISABLED=true` in backend `.env`

### Sales Report Shows Same Values

1. **Verify order statuses in database:**
   ```sql
   SELECT status, COUNT(*), SUM(total_price) 
   FROM orders 
   GROUP BY status;
   ```

2. **Check if you have orders with different statuses:**
   - Need at least one order with `status = 'completed'`
   - And one with a different status (e.g., 'pending', 'processing')

3. **Clear cache:**
   - Stop backend server
   - Clear Redis cache (if Redis is configured)
   - Restart backend
   - Refresh frontend

### Item/Order Update Fails

1. **Check backend logs** for database connection errors
2. **Verify database connection** string in `.env`
3. **Check network connectivity** to database
4. **Look for validation errors** in API response

## Notes

- Cache TTL for orders is 60 seconds - changes may not appear immediately
- Database retry logic attempts 3 retries with exponential backoff (100ms, 200ms, 400ms)
- Sales analytics cache is 60 seconds
- If testing locally, ensure database credentials are correct
