# Next.js API Routes Documentation

## Overview

This Next.js application includes **24 fully functional API routes** that provide complete backend functionality, eliminating the need for a separate Express server.

## Architecture

**Unified Full-Stack App**:
```
Next.js (Port 3000)
├── Frontend (React Components, Server Components)
└── Backend (API Routes - 24 endpoints)
    └── Database (Neon PostgreSQL)
```

## Authentication

All API routes (except public and health endpoints) are protected by NextAuth.js authentication middleware.

### Authentication Flow

1. User signs in with Google OAuth via NextAuth
2. Session is created and stored
3. Middleware checks session on each API request
4. Protected routes return 401 if not authenticated

### Bypass Authentication (Development Only)

Set `AUTH_DISABLED=true` in `.env` to disable authentication in development:

```bash
AUTH_DISABLED=true
NODE_ENV=development
```

**⚠️ WARNING**: Never use `AUTH_DISABLED=true` in production!

## API Routes

### Items API (7 endpoints)

#### GET /api/items
List items with cursor-based pagination.

**Query Parameters:**
- `limit` (optional): Number of items per page (10, 20, 50, or 100)
- `cursor` (optional): Cursor for next page
- `search` (optional): Search term

**Response:**
```json
{
  "items": [...],
  "page": {
    "hasMore": true,
    "nextCursor": "timestamp:id"
  }
}
```

**Caching:** 24 hours (CDN), 12 hours stale-while-revalidate

#### POST /api/items
Create a new item.

**Request Body:**
```json
{
  "name": "Item Name",
  "price": 99.99,
  "color": "Blue",
  "fabric": "Cotton",
  "specialFeatures": "Custom embroidery",
  "image": "data:image/jpeg;base64,..." // Optional base64 image
}
```

**Response:** Created item object (201)

#### GET /api/items/deleted
List soft-deleted items (same pagination as GET /api/items).

#### PUT /api/items/[id]
Update an existing item.

**Request Body:** Same as POST, all fields optional

**Response:** Updated item object

#### DELETE /api/items/[id]
Soft delete an item.

**Response:** `{ "message": "Item deleted" }`

#### POST /api/items/[id]/restore
Restore a soft-deleted item.

**Response:** Restored item object

#### DELETE /api/items/[id]/permanent
Permanently remove the image from a soft-deleted item.

**Response:** `{ "message": "Item image permanently removed" }`

---

### Orders API (5 endpoints)

#### GET /api/orders
List orders with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "orders": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

**Caching:** 5 minutes

#### POST /api/orders
Create a new order.

**Request Body:**
```json
{
  "orderFrom": "phone",
  "customerName": "John Doe",
  "customerId": "CUST123",
  "address": "123 Main St",
  "items": [
    {
      "itemId": 1,
      "name": "Item Name",
      "price": 99.99,
      "quantity": 2,
      "customizationRequest": "Size: Large"
    }
  ],
  "status": "pending",
  "paymentStatus": "unpaid",
  "confirmationStatus": "unconfirmed",
  "expectedDeliveryDate": "2024-12-31",
  "deliveryStatus": "not_shipped"
}
```

**Response:** Created order object (201)

#### GET /api/orders/[id]
Get order details by ID.

**Response:** Order object with items

**Caching:** 5 minutes

#### PUT /api/orders/[id]
Update an existing order.

**Request Body:** Same as POST, all fields optional

**Response:** Updated order object

#### GET /api/orders/priority
Get priority orders based on delivery dates.

**Response:**
```json
{
  "urgent": [...],    // Delivery in < 7 days
  "upcoming": [...],  // Delivery in 7-14 days
  "overdue": [...]    // Past delivery date
}
```

**Caching:** 5 minutes

---

### Feedbacks API (9 endpoints)

#### GET /api/feedbacks
List all feedbacks with pagination.

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:** Paginated feedbacks

**Caching:** 5 minutes

#### POST /api/feedbacks
Create feedback (admin/internal use).

**Request Body:**
```json
{
  "orderId": 123,
  "rating": 5,
  "comment": "Great service!",
  "productQuality": 5,
  "deliveryExperience": 4,
  "isPublic": true
}
```

**Response:** Created feedback object (201)

#### GET /api/feedbacks/[id]
Get feedback by ID.

**Response:** Feedback object

#### PUT /api/feedbacks/[id]
Update feedback (add admin response).

**Request Body:**
```json
{
  "responseText": "Thank you for your feedback!",
  "isPublic": true
}
```

**Response:** Updated feedback object

#### DELETE /api/feedbacks/[id]
Delete feedback.

**Response:** `{ "message": "Feedback deleted" }`

#### POST /api/feedbacks/generate-token/[orderId]
Generate a secure token for customer feedback submission.

**Response:**
```json
{
  "token": "secure_token_string",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

#### GET /api/feedbacks/order/[orderId]
Get feedback for a specific order.

**Response:** Feedback object or 404

#### POST /api/public/feedbacks
**Public endpoint** - Submit feedback using a token (no authentication required).

**Request Body:**
```json
{
  "token": "secure_token_from_email",
  "rating": 5,
  "comment": "Excellent product!",
  "productQuality": 5,
  "deliveryExperience": 4
}
```

**Response:** Created feedback object (201)

#### POST /api/public/feedbacks/validate-token
**Public endpoint** - Validate a feedback token.

**Request Body:**
```json
{
  "token": "secure_token_string"
}
```

**Response:**
```json
{
  "order": {
    "_id": 123,
    "orderId": "ORD-001",
    "status": "completed"
  },
  "hasExistingFeedback": false
}
```

---

### Analytics API (1 endpoint)

#### GET /api/analytics/sales
Get sales analytics data.

**Query Parameters:**
- `statusFilter` (optional): `completed` (default) or `all`

**Response:**
```json
{
  "analytics": {
    "last7days": { "totalSales": 1000, "orderCount": 10 },
    "last30days": { "totalSales": 5000, "orderCount": 50 },
    "last90days": { "totalSales": 15000, "orderCount": 150 },
    "last365days": { "totalSales": 60000, "orderCount": 600 }
  },
  "statusFilter": "completed"
}
```

**Caching:** 1 minute

---

### Digest API (1 endpoint)

#### POST /api/internal/digest/run
**Protected endpoint** - Trigger daily digest email.

**Authentication:** Requires `X-DIGEST-SECRET` header or Vercel `CRON_SECRET` authorization.

**Headers:**
```
X-DIGEST-SECRET: your_digest_secret
```

**Response:**
```json
{
  "message": "Digest completed successfully",
  "status": "sent",
  "digestDate": "2024-01-15"
}
```

---

### Health Check (1 endpoint)

#### GET /api/health
**Public endpoint** - Health check (no authentication).

**Response:**
```json
{
  "status": "ok"
}
```

---

## Caching Strategy

The API implements a dual-layer caching approach:

### 1. Next.js Native Caching

Uses `Cache-Control` headers for CDN and browser caching:

```typescript
return NextResponse.json(result, {
  headers: {
    'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200'
  }
});
```

- **Items**: 24 hours CDN cache, 12 hours stale-while-revalidate
- **Orders/Feedbacks**: 5 minutes CDN cache, 10 minutes stale-while-revalidate
- **Analytics**: 1 minute CDN cache, 2 minutes stale-while-revalidate

### 2. Redis Caching (Optional)

If `REDIS_URL` is configured, the app uses Redis for server-side caching with the same logic as the Express backend.

## Error Handling

All API routes return consistent error responses:

```json
{
  "message": "Error description"
}
```

**Common Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (authentication required)
- `404`: Not Found
- `500`: Internal Server Error

## Environment Variables

Required variables (see `.env.example`):

```bash
# Database
NEON_DATABASE_URL=postgresql://...

# Storage
BLOB_READ_WRITE_TOKEN=...

# Authentication
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

# Optional
REDIS_URL=...
EMAIL_HOST=...
DIGEST_JOB_SECRET=...
AUTH_DISABLED=false # Development only
```

## Testing API Routes

### Using cURL

```bash
# Health check (public)
curl http://localhost:3000/api/health

# Get items (requires auth or AUTH_DISABLED=true)
curl http://localhost:3000/api/items

# Create item
curl -X POST http://localhost:3000/api/items \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Item","price":99.99}'

# Get orders
curl http://localhost:3000/api/orders

# Public feedback submission
curl -X POST http://localhost:3000/api/public/feedbacks \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_TOKEN","rating":5,"comment":"Great!"}'
```

### Using the Frontend

The Next.js frontend automatically uses these routes when `NEXT_PUBLIC_API_URL=/api` (default).

## Migration from Express

The API routes provide **100% feature parity** with the Express backend:

| Feature | Express | Next.js API Routes |
|---------|---------|-------------------|
| Endpoints | 24 | ✅ 24 |
| Authentication | JWT | ✅ NextAuth |
| Caching | Redis | ✅ Next.js + Redis |
| Image Upload | Vercel Blob | ✅ Vercel Blob |
| Database | Drizzle ORM | ✅ Drizzle ORM |
| Validation | Manual | ✅ Same logic |

## Performance

- **Response Times**: Similar to Express (< 100ms for cached, < 500ms for database queries)
- **Caching**: Better with Next.js CDN caching + Redis
- **Bundle Size**: Smaller (shared code between client/server)
- **Cold Starts**: Faster on Vercel (optimized for Next.js)

## Deployment

### Vercel (Recommended)

```bash
vercel deploy
```

All environment variables must be configured in Vercel dashboard.

### Other Platforms

Ensure the platform supports:
- Node.js 18+
- Next.js 15+
- Environment variables
- File system access for caching

## Troubleshooting

### "Unauthorized" errors

1. Check if authenticated (sign in via `/login`)
2. For development, set `AUTH_DISABLED=true` in `.env`
3. Verify `NEXTAUTH_SECRET` is set

### Database connection errors

1. Verify `NEON_DATABASE_URL` is correct
2. Check Neon database is accessible
3. Ensure SSL mode is set: `?sslmode=require`

### Image upload failures

1. Verify `BLOB_READ_WRITE_TOKEN` is set
2. Check Vercel Blob Storage is configured
3. Ensure image size is < 5MB

### Caching issues

1. Clear browser cache
2. Restart development server
3. Check Redis connection if using `REDIS_URL`

## Support

For issues or questions, see:
- [NEXTJS_API_MIGRATION.md](./NEXTJS_API_MIGRATION.md) - Technical migration guide
- [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md) - Overview
