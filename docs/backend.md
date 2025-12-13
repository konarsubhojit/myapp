# Backend Technical Documentation

## Overview

The Order Management System backend is a RESTful API built with **Node.js**, **Express**, and **PostgreSQL** (Neon serverless). It follows an **ES Module (ESM)** architecture with robust authentication, caching, and database optimization features.

**Key Technologies:**
- Runtime: Node.js v18+
- Framework: Express 4.x
- Database: Neon PostgreSQL (serverless) with Drizzle ORM
- Cache: Redis (optional, with graceful degradation)
- Auth: Google OAuth 2.0 with JWT validation via JWKS
- Image Storage: Vercel Blob Storage
- Logging: Custom structured logger
- Testing: Jest with ES Module support

---

## Request Lifecycle

### High-Level Flow

Every authenticated request flows through several middleware layers before reaching the business logic:

```
Client Request
    ↓
Express Server (server.js)
    ↓
CORS + Body Parsing
    ↓
Rate Limiting (express-rate-limit)
    ↓
Authentication Middleware (auth.js)
    ↓
Cache Middleware (cache.js) - GET only
    ↓
Route Handler (routes/*.js)
    ↓
Model (models/*.js) with DB Retry
    ↓
Database (Neon PostgreSQL via Drizzle ORM)
    ↓
Response + Cache Population
    ↓
Client
```

### Detailed Request Lifecycle Diagram

```mermaid
sequenceDiagram
    participant Client
    participant Express
    participant RateLimit
    participant Auth
    participant Cache
    participant Route
    participant Model
    participant DB
    
    Client->>Express: HTTP Request (with JWT)
    Express->>Express: CORS + Body Parsing
    Express->>RateLimit: Check rate limit
    alt Rate limit exceeded
        RateLimit-->>Client: 429 Too Many Requests
    end
    
    RateLimit->>Auth: Validate JWT token
    Auth->>Auth: Decode JWT header
    Auth->>JWKS: Fetch Google signing key (cached)
    JWKS-->>Auth: Return public key
    Auth->>Auth: Verify JWT signature & claims
    alt Auth failed
        Auth-->>Client: 401 Unauthorized
    end
    
    Auth->>Cache: GET request? Check cache
    alt Cache hit
        Cache-->>Client: Return cached response
    end
    
    Cache->>Route: Cache miss - proceed
    Route->>Route: Validate request params
    Route->>Model: Call business logic
    Model->>DB: Execute Drizzle query (with retry)
    DB-->>Model: Return data
    Model-->>Route: Transform & return data
    Route->>Cache: Populate cache (async)
    Route-->>Client: JSON response
```

---

## Authentication Flow

### Google JWT Validation via JWKS

The backend uses **Google OAuth 2.0 ID tokens** validated using **JWKS (JSON Web Key Set)**. No shared secrets are required—the backend fetches Google's public keys to verify token signatures.

```mermaid
sequenceDiagram
    participant Client
    participant AuthMiddleware
    participant JWKSClient
    participant GoogleJWKS
    participant JWTVerify
    
    Client->>AuthMiddleware: Authorization: Bearer <JWT>
    AuthMiddleware->>AuthMiddleware: Extract token from header
    AuthMiddleware->>JWTVerify: Decode JWT (header + payload)
    JWTVerify-->>AuthMiddleware: { kid, iss, aud, ... }
    
    AuthMiddleware->>JWKSClient: getSigningKey(kid)
    
    alt Key in cache
        JWKSClient-->>AuthMiddleware: Return cached key
    else Key not cached
        JWKSClient->>GoogleJWKS: GET https://www.googleapis.com/oauth2/v3/certs
        GoogleJWKS-->>JWKSClient: JWKS response
        JWKSClient->>JWKSClient: Cache key (24h)
        JWKSClient-->>AuthMiddleware: Return public key
    end
    
    AuthMiddleware->>JWTVerify: Verify signature with public key
    JWTVerify->>JWTVerify: Check issuer (accounts.google.com)
    JWTVerify->>JWTVerify: Check audience (GOOGLE_CLIENT_ID)
    JWTVerify->>JWTVerify: Check expiration
    
    alt Verification succeeds
        JWTVerify-->>AuthMiddleware: Decoded payload
        AuthMiddleware->>AuthMiddleware: Extract user info (id, email, name)
        AuthMiddleware-->>Client: Proceed to route (req.user set)
    else Verification fails
        JWTVerify-->>AuthMiddleware: Error
        AuthMiddleware-->>Client: 401 Invalid or expired token
    end
```

**Key Security Features:**
- **No shared secrets**: Uses asymmetric cryptography (RS256)
- **Key caching**: JWKS keys cached for 24 hours (configurable)
- **Rate limiting**: Max 10 JWKS requests/minute to prevent abuse
- **Issuer validation**: Only accepts `accounts.google.com` or `https://accounts.google.com`
- **Audience validation**: Token must be issued for `GOOGLE_CLIENT_ID`
- **Production safety**: `AUTH_DISABLED=true` blocked in production (see `backend/middleware/auth.js:112-115`)

**Implementation:** `backend/middleware/auth.js`

---

## Cache Flow

### Redis Caching with Versioned Keys & Stampede Prevention

The backend uses **Redis** for caching GET requests with **global versioned cache keys** for efficient invalidation in serverless environments (Vercel). It also includes **request coalescing** to prevent cache stampedes (multiple requests triggering duplicate DB queries).

```mermaid
flowchart TD
    A[GET Request] --> B{Redis available?}
    B -->|No| Z[Skip cache - proceed to DB]
    B -->|Yes| C[Get global cache version]
    C --> D[Generate versioned cache key]
    D --> E{Cache hit?}
    E -->|Yes| F[Return cached data]
    E -->|No| G{Pending request for key?}
    
    G -->|Yes - Stampede detected| H[Wait for pending request]
    H --> I{Pending request completed?}
    I -->|Yes| J[Return coalesced data]
    I -->|Timeout| K[Re-check cache or fetch from DB]
    
    G -->|No| L[Register as pending request]
    L --> M[Proceed to route handler]
    M --> N[Execute DB query]
    N --> O[Validate response]
    O --> P{Valid for caching?}
    P -->|Yes| Q[Cache response async]
    P -->|No| R[Skip caching]
    Q --> S[Notify waiting requests]
    R --> S
    S --> T[Return response]
    
    Z --> M
    F --> U[Client]
    J --> U
    T --> U
```

### Cache Key Format

Cache keys are **versioned** and include the **HTTP method** for efficient invalidation in serverless environments:

**Format:** `v{VERSION}:{METHOD}:{FULL_PATH}?{SORTED_QUERY}`

```javascript
// Example versioned cache keys (assuming version = 5)
GET /api/items                         → v5:GET:/api/items
GET /api/items?page=1&limit=10        → v5:GET:/api/items?limit=10&page=1
GET /api/orders/priority               → v5:GET:/api/orders/priority
GET /api/feedbacks?page=2&limit=20    → v5:GET:/api/feedbacks?limit=20&page=2
```

**Key Components:**
- **Version prefix** (`v5`): Global cache version stored in Redis key `cache:v:global`
- **HTTP method** (`GET`): Ensures different methods don't collide
- **Full path**: baseUrl + path from Express router
- **Sorted query params**: Ensures consistent keys regardless of param order

**Why versioned keys?**
- **O(1) invalidation**: Bump version number to invalidate all caches (no need to scan/delete keys)
- **Serverless-friendly**: Avoids SCAN operations which are slow in serverless environments
- **Multi-instance safe**: All instances see version changes via Redis

**Implementation:** `backend/middleware/cache.js:176-196`

### Cache TTLs (Time-To-Live)

Different endpoints have different cache durations based on data volatility:

| Endpoint                | TTL      | Reason                                    |
|-------------------------|----------|-------------------------------------------|
| `/api/items`            | 24 hours | Item catalog changes infrequently         |
| `/api/orders/priority`  | 5 minutes| Delivery dates change frequently          |
| `/api/orders?page=...`  | Dynamic  | No cache (real-time order history)        |
| `/api/feedbacks`        | 24 hours | Feedback data is mostly read-only         |
| `/api/analytics/sales`  | 1 minute | Pre-computed analytics, short cache       |

**Default TTL:** 300 seconds (5 minutes) if not specified

### Cache Invalidation

Cache is invalidated **immediately after** data modifications using **global version bumping**:

```javascript
// All invalidation functions now use version bumping (O(1) operation)
invalidateItemCache()      → Bumps global cache version
invalidateOrderCache()     → Bumps global cache version
invalidateFeedbackCache()  → Bumps global cache version

// Direct version bump (recommended for new code)
bumpGlobalCacheVersion()   → Increments Redis key 'cache:v:global'
```

**How it works:**
1. All cache keys include the current version number: `v5:GET:/api/items`
2. When data changes, `bumpGlobalCacheVersion()` increments the version: `5 → 6`
3. New requests use the new version: `v6:GET:/api/items` (cache miss, fresh data fetched)
4. Old cached entries (`v5:*`) remain in Redis but are never accessed (expire via TTL)

**Benefits:**
- **O(1) invalidation**: Single Redis `INCR` operation vs scanning/deleting thousands of keys
- **Serverless-optimized**: No blocking SCAN operations
- **Atomic**: All caches invalidated instantly
- **Multi-instance safe**: Version changes visible to all serverless instances

**Version Memoization:**
- Each serverless instance caches the version number in memory for **200ms**
- Reduces Redis GET calls during burst traffic
- Trade-off: Up to 200ms staleness window after invalidation across instances
- Configurable via `VERSION_MEMO_TTL_MS` (set to 0 to disable)

**Legacy SCAN-based invalidation:**
- `invalidateCache(pattern)` still available but **deprecated**
- Use `bumpGlobalCacheVersion()` for new code

**Implementation:** `backend/middleware/cache.js:10-158, 402-448`

### Request Coalescing (Stampede Prevention)

When multiple identical requests arrive simultaneously:

1. **First request**: Registers as "pending" and proceeds to fetch from DB
2. **Subsequent requests**: Wait for the first request to complete (max 30s timeout)
3. **On completion**: First request caches data and notifies all waiting requests
4. **Result**: Only 1 DB query instead of N queries

**Note:** Coalescing uses the full versioned cache key, so requests during a version transition may not coalesce (acceptable trade-off for freshness).

**Implementation:** `backend/middleware/cache.js:28-231, 240-359`

---

## Entry Point & Boot Sequence

### `backend/server.js`

**Boot sequence:**

1. **Load environment variables** (`dotenv/config`)
2. **Create Express app** with trust proxy settings
3. **Initialize logger** (`utils/logger.js`)
4. **Configure middleware stack:**
   - CORS
   - Body parsing (JSON + URL-encoded, 10MB limit)
   - Rate limiting (100 requests per 15 minutes)
5. **Connect to database** (Neon PostgreSQL)
   - Connection pooling via global cache
   - Fails fast if `NEON_DATABASE_URL` missing
6. **Connect to Redis** (optional)
   - Graceful degradation if Redis unavailable
   - Caching disabled if connection fails
7. **Register routes:**
   - Public routes: `/api/public/feedbacks` (no auth)
   - Authenticated routes: `/api/items`, `/api/orders`, `/api/feedbacks`, `/api/analytics`
   - Health check: `/api/health` (no auth)
8. **Register global error handler** (`utils/errorHandler.js`)
9. **Start HTTP server** (unless `NODE_ENV=test`)

**Key Configuration:**
- Port: `process.env.PORT` or `5000`
- Trust Proxy: Level 1 (for rate limiting behind proxies)
- Body Limits: 10MB (JSON and URL-encoded)

---

## Route Structure

### Base Paths

| Base Path                    | Mounted Router         | Auth Required | Description                          |
|------------------------------|------------------------|---------------|--------------------------------------|
| `/api/public/feedbacks`      | `publicFeedbacks.js`   | No            | Customer feedback submission         |
| `/api/items`                 | `items.js`             | Yes           | Item/product management              |
| `/api/orders`                | `orders.js`            | Yes           | Order management                     |
| `/api/feedbacks`             | `feedbacks.js`         | Yes           | Internal feedback management         |
| `/api/analytics`             | `analytics.js`         | Yes           | Sales analytics                      |
| `/api/health`                | Inline handler         | No            | Health check                         |

### Complete API Endpoints

| Method | Path                                | Auth | Cache TTL | Purpose                                         |
|--------|-------------------------------------|------|-----------|-------------------------------------------------|
| GET    | `/api/health`                       | No   | None      | Health check                                    |
| POST   | `/api/public/feedbacks/validate-token` | No   | None      | Validate feedback token                         |
| POST   | `/api/public/feedbacks`             | No   | None      | Submit customer feedback (token-based)          |
| GET    | `/api/items`                        | Yes  | 24h       | List all items (paginated, with search)         |
| GET    | `/api/items/deleted`                | Yes  | 24h       | List soft-deleted items (paginated)             |
| POST   | `/api/items`                        | Yes  | None      | Create new item (with image upload)             |
| PUT    | `/api/items/:id`                    | Yes  | None      | Update item (with optional image update)        |
| DELETE | `/api/items/:id`                    | Yes  | None      | Soft delete item                                |
| POST   | `/api/items/:id/restore`            | Yes  | None      | Restore soft-deleted item                       |
| DELETE | `/api/items/:id/permanent`          | Yes  | None      | Permanently delete item's image                 |
| GET    | `/api/orders`                       | Yes  | None      | List orders (paginated, no cache)               |
| GET    | `/api/orders/all`                   | Yes  | 24h       | List all orders (no pagination, cached)         |
| GET    | `/api/orders/priority`              | Yes  | 5min      | List urgent orders (delivery date-based)        |
| POST   | `/api/orders`                       | Yes  | None      | Create new order                                |
| GET    | `/api/orders/:id`                   | Yes  | 24h       | Get order details                               |
| PUT    | `/api/orders/:id`                   | Yes  | None      | Update order                                    |
| GET    | `/api/feedbacks`                    | Yes  | 24h       | List all feedbacks (paginated)                  |
| GET    | `/api/feedbacks/order/:orderId`     | Yes  | 24h       | Get feedback for specific order                 |
| GET    | `/api/feedbacks/stats`              | Yes  | 24h       | Get feedback statistics                         |
| GET    | `/api/feedbacks/:id`                | Yes  | 24h       | Get specific feedback                           |
| POST   | `/api/feedbacks`                    | Yes  | None      | Create feedback (admin)                         |
| PUT    | `/api/feedbacks/:id`                | Yes  | None      | Update feedback (add response)                  |
| POST   | `/api/feedbacks/generate-token/:orderId` | Yes | None      | Generate feedback token for customer            |
| GET    | `/api/analytics/sales`              | Yes  | 1min      | Get sales analytics (pre-computed)              |

**Note:** All authenticated endpoints require `Authorization: Bearer <JWT>` header with a valid Google ID token.

---

## Authentication Details

### Middleware: `backend/middleware/auth.js`

**Flow:**
1. Extract `Authorization` header
2. Validate format: `Bearer <token>`
3. Decode JWT to get `kid` (key ID) and `iss` (issuer)
4. Verify issuer is Google (`GOOGLE_ISSUERS` constant)
5. Fetch signing key from Google JWKS endpoint (cached)
6. Verify JWT signature using RS256 algorithm
7. Validate `audience` matches `GOOGLE_CLIENT_ID`
8. Extract user info: `{ id, email, name, provider }`
9. Set `req.user` for downstream handlers

**Environment Variables:**
- `GOOGLE_CLIENT_ID` (required): OAuth client ID from Google Cloud Console
- `AUTH_DISABLED` (optional): Set to `'true'` to disable auth in development **only**

**Production Safety Check:**
```javascript
if (process.env.AUTH_DISABLED === 'true' && process.env.NODE_ENV === 'production') {
  return res.status(500).json({ message: 'Server configuration error' });
}
```

**JWKS Configuration** (`backend/constants/authConstants.js`):
- Cache max age: 24 hours
- Rate limit: 10 requests/minute
- JWKS URI: `https://www.googleapis.com/oauth2/v3/certs`

**Supported Issuers:**
- `https://accounts.google.com`
- `accounts.google.com`

---

## Database

### Neon PostgreSQL (Serverless)

**Connection:** `backend/db/connection.js`

The backend uses **Neon's HTTP-based serverless PostgreSQL** via the `@neondatabase/serverless` package with **Drizzle ORM**.

**Connection Caching:**
```javascript
let cached = global.neonDb; // Global cache for serverless environments

export function getDatabase() {
  if (cached.db) return cached.db; // Return cached connection
  
  const sql = neon(process.env.NEON_DATABASE_URL);
  cached.db = drizzle({ client: sql, schema });
  return cached.db;
}
```

**Why caching?** Serverless functions reuse execution contexts, so caching prevents redundant connection overhead.

### Drizzle ORM

**Schema:** `backend/db/schema.js`

The schema defines 5 tables:

1. **`items`**: Product catalog (with soft delete support)
2. **`orders`**: Order management (with delivery tracking)
3. **`order_items`**: Junction table (orders ↔ items, many-to-many)
4. **`feedbacks`**: Customer feedback (multi-dimensional ratings)
5. **`feedback_tokens`**: Secure token-based feedback access

**Enums:**
- `order_from`: `instagram`, `facebook`, `whatsapp`, `call`, `offline`
- `order_status`: `pending`, `processing`, `completed`, `cancelled` (deprecated, now text field)

**Performance Indexes (13 total):**

| Table              | Index Name                  | Column(s)                | Purpose                              |
|--------------------|-----------------------------|--------------------------|--------------------------------------|
| items              | `items_name_idx`            | `name`                   | Fast product name searches           |
| items              | `items_deleted_at_idx`      | `deleted_at`             | Efficient soft-delete filtering      |
| orders             | `orders_order_id_idx`       | `order_id`               | Quick order ID lookups               |
| orders             | `orders_customer_id_idx`    | `customer_id`            | Customer-based filtering             |
| orders             | `orders_delivery_date_idx`  | `expected_delivery_date` | Date range queries                   |
| orders             | `orders_priority_idx`       | `priority`               | Priority-based sorting               |
| orders             | `orders_status_idx`         | `status`                 | Status filtering                     |
| feedbacks          | `idx_feedbacks_order_id`    | `order_id`               | Order feedback retrieval             |
| feedbacks          | `idx_feedbacks_rating`      | `rating`                 | Rating-based analysis                |
| feedbacks          | `idx_feedbacks_created_at`  | `created_at`             | Chronological sorting (DESC)         |
| feedbacks          | `idx_feedbacks_is_public`   | `is_public`              | Public/private filtering             |
| feedback_tokens    | `idx_feedback_tokens_order_id` | `order_id`            | Token lookup by order                |
| feedback_tokens    | `idx_feedback_tokens_token` | `token`                  | Fast token validation                |

### Models

**Pattern:** `backend/models/*.js`

Models encapsulate database queries using Drizzle ORM:

- `Item.js`: CRUD operations for items (with soft delete)
- `Order.js`: CRUD operations for orders (with order items)
- `Feedback.js`: CRUD operations for feedbacks
- `FeedbackToken.js`: Token generation and validation

**Key Features:**
- **Retry logic**: All read operations wrapped in `executeWithRetry` (see `backend/utils/dbRetry.js`)
- **Data transformation**: Drizzle results transformed to API-friendly format
- **Soft delete**: Items use `deleted_at` timestamp (null = active)
- **Batched queries**: Order items fetched in bulk using `inArray` (prevents N+1 problem)

### Migrations

**Location:** `backend/db/migrations/`

**Migration Script:** `001_init_schema.sql` (consolidated single migration)

Includes:
- All table definitions
- All indexes
- Enums
- Foreign keys with cascade deletes
- Check constraints

**Run Migration:**
```bash
psql $NEON_DATABASE_URL -f backend/db/migrations/001_init_schema.sql
```

**Documentation:** See [`backend/db/migrations/README.md`](../backend/db/migrations/README.md) for detailed migration guide.

---

## Caching

### Redis Client: `backend/db/redisClient.js`

**Features:**
- **Singleton pattern**: Single Redis connection shared across app
- **Graceful degradation**: App continues if Redis unavailable
- **Auto-reconnect**: Exponential backoff (50ms, 100ms, 200ms, ...)
- **Max retries**: 10 attempts before giving up
- **Connection pooling**: Reuses existing connection if available
- **Serverless optimization**: `getRedisIfReady()` provides synchronous access to already-connected client

**Key Functions:**
- `getRedisClient()`: Async function to get or create Redis connection
- `getRedisIfReady()`: Synchronous check for ready Redis client (serverless-optimized)
- `closeRedisClient()`: Gracefully close connection
- `isRedisConnected()`: Check if Redis is connected

**Environment Variable:**
- `REDIS_URL` (optional): Redis connection string (e.g., `redis://localhost:6379`)

**If Redis is not configured:** All cache operations become no-ops (app runs without caching).

**Serverless Optimization:**
The `getRedisIfReady()` function allows cache middleware to check for an existing connection without the overhead of async connection establishment, improving cold start performance in serverless environments.

### Cache Middleware: `backend/middleware/cache.js`

See [Cache Flow](#cache-flow) section for detailed explanation.

**Key Functions:**
- `cacheMiddleware(ttl)`: Express middleware for caching GET requests with versioned keys
- `generateCacheKey(req, version)`: Generate versioned cache key from request
- `getGlobalCacheVersion(redis)`: Get current cache version with in-memory memoization
- `bumpGlobalCacheVersion()`: Increment cache version for O(1) invalidation (recommended)
- `invalidateItemCache()`: Invalidate item caches via version bump
- `invalidateOrderCache()`: Invalidate order caches via version bump
- `invalidateFeedbackCache()`: Invalidate feedback caches via version bump
- `invalidateCache(pattern)`: Legacy SCAN-based invalidation (deprecated)
- `clearAllCache()`: Flush entire Redis database and reset version

**Response Validation:**

The cache middleware validates responses before caching to prevent caching errors:
- Skips `null` or `undefined` responses
- Skips error responses (e.g., `{ error: "..." }`)
- Validates paginated responses have `items` array and `pagination` metadata
- Skips responses that fail validation

**Versioned Cache Architecture:**
- All cache keys include global version: `v{VERSION}:{METHOD}:{PATH}`
- Version stored in Redis key `cache:v:global` (default: 1)
- Version memoized in memory for 200ms to reduce Redis calls
- Invalidation via version bump (O(1)) instead of key scanning (O(N))
- Old versioned keys expire naturally via TTL

**See also:** [`docs/DATABASE_AND_CACHE_OPTIMIZATION.md`](./DATABASE_AND_CACHE_OPTIMIZATION.md) for optimization details.

---

## Image Uploads

### Vercel Blob Storage

**Implementation:** `backend/routes/items.js`

**Flow:**
1. Client sends base64-encoded image in request body: `data:image/jpeg;base64,<data>`
2. Server decodes base64 and validates image format (JPEG, PNG, GIF, WebP)
3. Server checks file size (max 5MB, configurable)
4. Server uploads to Vercel Blob Storage with public access
5. Server returns blob URL: `https://blob.vercel-storage.com/items/<filename>`
6. URL stored in `items.image_url` column

**Image Operations:**
- **Create item**: Upload new image
- **Update item**: Upload new image, delete old image from blob storage
- **Delete item (soft)**: Image URL preserved (not deleted from blob)
- **Restore item**: Image URL restored from database
- **Permanent delete**: Manually delete image from blob storage

**Environment Variable:**
- `BLOB_READ_WRITE_TOKEN` (required): Vercel Blob Storage access token

**Size Limits:**
- Max file size: 5MB (configurable via `IMAGE_CONFIG.MAX_SIZE`)
- Enforced in `backend/routes/items.js:24-26`

**Blob URL Format:**
```
https://blob.vercel-storage.com/items/<timestamp>-<random>.<extension>
```

---

## Cross-Cutting Concerns

### Rate Limiting

**Implementation:** `backend/server.js:25-29`

Uses **`express-rate-limit`** package:
```javascript
rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // Max 100 requests per window
  message: { message: 'Too many requests, please try again later.' }
})
```

**Applied to:** All `/api/*` routes

**Headers returned:**
- `X-RateLimit-Limit`: Max requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Timestamp when limit resets

**Configuration:** `backend/constants/httpConstants.js`

### Logging

**Implementation:** `backend/utils/logger.js`

Custom structured logger with **context-aware** logging:

```javascript
const logger = createLogger('ModuleName');
logger.info('Message', { metadata: 'value' });
// Output: [2024-12-13T10:30:00.000Z] [INFO] [ModuleName] Message {"metadata":"value"}
```

**Log Levels:**
- `error`: Critical errors (always logged)
- `warn`: Warnings (logged in production + dev)
- `info`: Informational (logged in production + dev)
- `debug`: Verbose debugging (only in development)

**Configuration:**
- Default level: `debug` (development), `info` (production)
- Override: Set `LOG_LEVEL` environment variable

**Features:**
- ISO 8601 timestamps
- Structured JSON metadata
- Error stack traces
- Context labels (e.g., `[Server]`, `[AuthMiddleware]`)

### Error Handling

**Implementation:** `backend/utils/errorHandler.js`

**Custom `ApiError` Class:**
```javascript
throw new ApiError(404, 'Item not found');
// Returns: { message: 'Item not found' } with 404 status
```

**Helper Functions:**
- `notFoundError(resource)`: 404 Not Found
- `badRequestError(message)`: 400 Bad Request
- `unauthorizedError(message)`: 401 Unauthorized
- `forbiddenError(message)`: 403 Forbidden

**Global Error Handler:**
```javascript
app.use(errorHandler); // Must be last middleware
```

**Behavior:**
- Known `ApiError`: Returns error message with appropriate status code
- Unknown errors: Returns `"Internal server error"` in production (hides stack traces)
- Logs all errors with request context (path, method)

**Async Handler Wrapper:**
```javascript
router.get('/', asyncHandler(async (req, res) => {
  // No try-catch needed - errors automatically caught
  const items = await Item.find();
  res.json(items);
}));
```

**See also:** All route handlers in `backend/routes/*.js` use `asyncHandler`.

### Pagination

**Implementation:** `backend/utils/pagination.js`

**Utility Functions:**
- `parsePaginationParams(query)`: Validates and parses `page` and `limit` from query string
- `calculateOffset(page, limit)`: Converts page number to SQL offset
- `buildPaginationResponse(page, limit, total)`: Builds standardized pagination metadata

**Allowed Limits:** `10`, `20`, `50`, `100` (configured in `backend/constants/paginationConstants.js`)

**Default Values:**
- Default page: `1`
- Default limit: `10`

**Response Format:**
```json
{
  "items": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

**Usage Example:**
```javascript
const { page, limit, search } = parsePaginationParams(req.query);
const result = await Item.findPaginated({ page, limit, search });
res.json(result); // { items: [...], pagination: {...} }
```

---

## Environment Variables

### Required Variables

| Variable               | Description                                           | Example                                                 |
|------------------------|-------------------------------------------------------|---------------------------------------------------------|
| `NEON_DATABASE_URL`    | Neon PostgreSQL connection string (pooled)            | `postgresql://user:pass@host.neon.tech/db?sslmode=require` |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID (from Google Cloud Console)    | `123456789-abcdefg.apps.googleusercontent.com`          |
| `BLOB_READ_WRITE_TOKEN`| Vercel Blob Storage access token                      | `vercel_blob_rw_XXXXXXXXXXXXXX`                         |

### Optional Variables

| Variable        | Description                                  | Default        | Notes                                         |
|-----------------|----------------------------------------------|----------------|-----------------------------------------------|
| `PORT`          | HTTP server port                             | `5000`         | Overridden by hosting platforms (e.g., Vercel) |
| `NODE_ENV`      | Environment mode                             | `development`  | Set to `production` in production             |
| `AUTH_DISABLED` | Disable authentication (dev only)            | `false`        | **Never set to `true` in production**         |
| `REDIS_URL`     | Redis connection string                      | None           | Caching disabled if not set                   |
| `LOG_LEVEL`     | Logging verbosity                            | Auto           | `error`, `warn`, `info`, `debug`              |

### Example `.env` File

See [`backend/.env.example`](../backend/.env.example) for complete template:

```env
NEON_DATABASE_URL=postgresql://user:password@ep-example-pooler.aws.neon.tech/neondb?sslmode=require
GOOGLE_CLIENT_ID=your_google_client_id_here
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here
PORT=5000
AUTH_DISABLED=false
REDIS_URL=redis://localhost:6379
```

---

## Local Development & Testing

### Commands

**From `backend/` directory:**

| Command                | Description                           |
|------------------------|---------------------------------------|
| `npm start`            | Start the server                      |
| `npm run dev`          | Start the server (alias for `start`)  |
| `npm test`             | Run Jest tests                        |
| `npm run test:watch`   | Run tests in watch mode               |
| `npm run test:coverage`| Run tests with coverage report        |

**From repository root:**

| Command         | Description                      |
|-----------------|----------------------------------|
| `npm run backend` | Start backend server           |
| `npm run install:all` | Install all dependencies   |

### Running the Backend

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Run migrations (if needed)
psql $NEON_DATABASE_URL -f db/migrations/001_init_schema.sql

# 4. Start server
npm start
# Server runs on http://localhost:5000
```

### Testing

**Test Framework:** Jest with ES Module support

**Test Structure:**
```
backend/__tests__/
├── routes/        # Route integration tests
├── models/        # Model unit tests
└── utils/         # Utility tests
```

**Running Tests:**
```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
```

**Note:** Tests use `--experimental-vm-modules` flag for ESM support.

---

## Additional Documentation

For deeper technical details, see:

- **[Database & Cache Optimization](./DATABASE_AND_CACHE_OPTIMIZATION.md)** - Response validation, cache invalidation strategies, retry logic
- **[Cache Fix Explanation](./CACHE_FIX_EXPLANATION.md)** - Stampede prevention, request coalescing details
- **[Implementation Summary](./IMPLEMENTATION_SUMMARY.md)** - Feature implementation details
- **[Migration Guide](../backend/db/migrations/README.md)** - Database schema and migration instructions

---

## Architecture Principles

1. **Fail Fast**: Database connection errors terminate app startup
2. **Graceful Degradation**: Redis failures don't crash the app
3. **Security First**: Auth disabled in production is blocked
4. **Serverless-First Caching**: Global versioned cache keys for O(1) invalidation
5. **Caching Strategy**: Long TTLs for static data, short/no cache for dynamic data
6. **N+1 Prevention**: Batched queries using `inArray` for related data
7. **Retry Logic**: Transient database errors automatically retried (3 attempts)
8. **Structured Logging**: All logs include context and metadata
9. **Error Transparency**: Development shows full errors, production hides internals

---

## Performance Considerations

- **Connection Pooling**: Neon HTTP uses connection pooling automatically
- **Index Coverage**: 13 indexes covering all common query patterns
- **Versioned Cache Keys**: O(1) cache invalidation via version bump (no SCAN operations)
- **Cache Stampede Prevention**: Request coalescing prevents duplicate DB queries
- **Version Memoization**: 200ms in-memory cache reduces Redis calls during burst traffic
- **Response Validation**: Prevents caching invalid/empty data
- **Serverless-Optimized Redis**: `getRedisIfReady()` reduces cold start overhead
- **Lazy Redis Connection**: Only connects when first request arrives
- **Async Cache Operations**: Cache writes don't block response to client

---

**Version**: 1.0.0  
**Last Updated**: 2024-12-13 (Updated for versioned cache keys)  
**Maintained by**: Order Management Team
