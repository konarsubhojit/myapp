# Frontend Technical Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Key Components](#key-components)
3. [User Journeys](#user-journeys)
4. [API Integration](#api-integration)
5. [State Management](#state-management)
6. [Development Setup](#development-setup)
7. [Flow Diagrams](#flow-diagrams)

---

## Architecture Overview

The frontend is a **React 19** single-page application built with **Vite** and **Material-UI v6**. It follows a component-based architecture with centralized state management using React Context API.

### Tech Stack
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite (fast HMR and optimized builds)
- **UI Library**: Material-UI (MUI) v6
- **State Management**: React Context API + TanStack Query (React Query v5)
- **Caching**: TanStack Query for client-side data caching
- **Routing**: State-based navigation (no React Router)
- **HTTP Client**: Native Fetch API with auth wrapper
- **Authentication**: Google OAuth (@react-oauth/google)
- **Testing**: Vitest + React Testing Library
- **Analytics**: Vercel Analytics + Speed Insights
- **Error Tracking**: Rollbar (optional)

### Architecture Principles
1. **Component-Based**: Modular, reusable components
2. **Context-Based State**: Global state via React Context (Auth, Currency, Notifications)
3. **Client-Side Caching**: TanStack Query for smart data fetching and caching
4. **Custom Hooks**: Business logic encapsulation (both traditional and Query hooks)
5. **Service Layer**: API abstraction with centralized auth
6. **Guest Mode**: View-only mode without backend calls
7. **Responsive Design**: Mobile-first with Material-UI breakpoints

---

## Key Components

### Core Application Components

#### 1. **App.tsx** (Main Container)
- **Responsibility**: Root application component and navigation controller
- **State Management**: Current route, items cache, navigation state
- **Key Features**:
  - State-based routing (no React Router for Vercel compatibility)
  - Mobile drawer navigation
  - Desktop top navigation bar
  - User authentication check
  - Priority notifications in header

#### 2. **Login.tsx**
- **Responsibility**: Authentication interface
- **Features**:
  - Google OAuth login button
  - Guest mode option (view-only)
  - Responsive design

#### 3. **ErrorBoundary.tsx**
- **Responsibility**: Global error handling
- **Features**:
  - Catch React component errors
  - Log to Rollbar (if configured)
  - Show user-friendly error message

### Feature Components

#### Order Management
- **OrderForm.tsx**: Create and edit orders with multi-item support
- **OrderHistory.tsx**: View, filter, and search past orders
- **OrderDetails.tsx**: Modal/drawer showing detailed order information
- **OrderDetailsPage.tsx**: Full-page order details view
- **PriorityNotificationPanel.tsx**: Urgent order alerts with badge

#### Item Management
- **CreateItem.tsx**: Add new items with image upload
- **BrowseItems.tsx**: View and manage inventory with pagination
- **ManageDeletedItems.tsx**: Restore or permanently delete soft-deleted items
- **ItemPanel.tsx**: Item detail modal

#### Analytics
- **SalesReport.tsx**: Sales analytics with time filters and charts
- **FeedbackPanel.tsx**: View and manage customer feedback

#### Navigation
- **TopNavigationBar.tsx**: Desktop horizontal navigation tabs
- **NavigationDrawer.tsx**: Mobile side drawer navigation

#### Common Components
- **CurrencySelector.tsx**: Multi-currency switcher
- **FeedbackDialog.tsx**: Feedback submission modal
- **common/**: Reusable UI components (buttons, cards, etc.)

### Contexts (Global State)

#### AuthContext.tsx
```typescript
interface AuthContextType {
  user: AuthUser | GuestUser | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  getAccessToken: () => Promise<string | null>;
  guestMode: boolean;
  enableGuestMode: () => void;
  logout: () => void;
}
```
- **Manages**: User authentication state, Google OAuth integration
- **Features**: 
  - JWT token management
  - Session persistence (sessionStorage)
  - Guest mode toggle
  - Unauthorized callback handling

#### CurrencyContext.tsx
```typescript
interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatPrice: (amount: number) => string;
}
```
- **Manages**: Currency selection (USD, EUR, GBP, INR)
- **Features**: Price formatting with currency symbols

#### NotificationContext.tsx
```typescript
interface NotificationContextType {
  showNotification: (message: string, severity: 'success' | 'error' | 'info' | 'warning') => void;
}
```
- **Manages**: Toast notifications (Snackbar)
- **Features**: Auto-dismiss, severity levels, queue management

### Custom Hooks

The application uses custom hooks to encapsulate business logic, with two types: **TanStack Query hooks** for data fetching/caching and **traditional hooks** for UI logic.

#### TanStack Query Hooks (Data Fetching & Caching)

**Query Hooks** (Read Operations):
| Hook | Purpose |
|------|---------|
| `useItems` | Fetch all items (non-paginated, cached) |
| `useItemsPaginated` | Fetch paginated items with search |
| `useDeletedItemsQuery` | Fetch soft-deleted items with pagination |
| `useOrdersAll` | Fetch all orders (cached) |
| `useOrdersPaginated` | Fetch paginated orders with filters |
| `useOrder` | Fetch single order details |
| `usePriorityOrdersQuery` | Fetch urgent orders for notifications |
| `useFeedbacks` | Fetch all feedbacks |
| `useFeedbacksPaginated` | Fetch paginated feedbacks |
| `useFeedback` | Fetch single feedback |
| `useFeedbackByOrderId` | Fetch feedback by order ID |
| `useFeedbackStats` | Fetch feedback statistics |
| `useSalesAnalyticsQuery` | Fetch sales analytics data |

**Mutation Hooks** (Write Operations):
| Hook | Purpose |
|------|---------|
| `useCreateItem` | Create new item, invalidates cache |
| `useUpdateItem` | Update item, invalidates cache |
| `useDeleteItem` | Soft delete item, invalidates cache |
| `useRestoreItem` | Restore soft-deleted item, invalidates cache |
| `usePermanentlyDeleteItem` | Permanently delete item |
| `useCreateOrder` | Create new order, invalidates cache |
| `useUpdateOrder` | Update order, invalidates cache |
| `useCreateFeedback` | Create feedback, invalidates cache |
| `useUpdateFeedback` | Update feedback, invalidates cache |
| `useGenerateFeedbackToken` | Generate feedback token |

#### Traditional Hooks (UI Logic & Legacy)
| Hook | Purpose |
|------|---------|
| `useItemsData` | Legacy: Fetch and manage items with pagination |
| `useDeletedItems` | Legacy: Manage soft-deleted items |
| `useItemForm` | Item creation/editing form logic |
| `useImageProcessing` | Image upload and compression |
| `useOrderDetails` | Legacy: Fetch and manage order details |
| `useOrderPagination` | Order infinite scroll with cursor pagination |
| `useOrderFilters` | Order filtering and sorting (client-side) |
| `usePriorityOrders` | Legacy: Fetch urgent orders for notifications |
| `useSalesAnalytics` | Legacy: Sales report data fetching |
| `useSalesAnalyticsOptimized` | Optimized sales analytics |
| `useInfiniteScroll` | Infinite scroll implementation |
| `useUrlSync` | Sync state with URL query parameters |

**Note**: The app is transitioning from traditional hooks to TanStack Query hooks for better caching and performance. Both are currently maintained for backward compatibility.

### Query Client Configuration

#### queryClient.ts
Singleton QueryClient with centralized caching configuration:
```typescript
{
  staleTime: 2 * 60_000,      // 2 minutes fresh
  gcTime: 15 * 60_000,        // Keep in cache for 15 minutes
  retry: 1,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
}
```

#### queryKeys.ts
Centralized query key factory for stable, consistent caching:
- Ensures proper cache invalidation
- Type-safe query keys
- Hierarchical key structure (e.g., `['items', 'page', params]`)

### Services

#### api.ts
Central API service with:
- **Auth Integration**: Automatic token injection via `setAccessTokenGetter()`
- **Guest Mode**: Mock responses when `guestMode` is enabled
- **Error Handling**: Unauthorized callback on 401 responses
- **Endpoints**: Items, Orders, Feedback, Analytics

---

## User Journeys

### 1. Login Flow
```
User visits app → AuthContext checks session
  ├─ Has valid session → Show app
  ├─ No session → Show Login page
  │   ├─ Click "Sign in with Google" → Google OAuth → Store token → Show app
  │   └─ Click "Continue as Guest" → Enable guest mode → Show app (read-only)
  └─ Click "Sign out" → Clear session → Show Login page
```

### 2. Create Order Flow
```
Navigate to "Create Order"
  ↓
Fill customer info (name, phone, source, etc.)
  ↓
Add items (select from inventory, set quantity)
  ↓
Set delivery details (address, expected date, priority)
  ↓
Set payment details (total, advance, balance)
  ↓
Submit → POST /api/orders → Show success notification → Clear form
```

### 3. View Order History Flow (Infinite Scroll)
```
Navigate to "Order History"
  ↓
Fetch first page (GET /api/orders/cursor?limit=10)
  ↓
Display orders in newest-first order (createdAt DESC)
  ├─ Scroll to bottom → Automatically load more
  │   ↓
  │   Fetch next page (GET /api/orders/cursor?limit=10&cursor=<nextCursor>)
  │   ↓
  │   Append orders to bottom (no re-sorting)
  ├─ Apply client-side filters (status, customer name, etc.)
  ├─ Search by order ID/customer (client-side on loaded orders)
  ├─ Click column header → Sort loaded orders (disables infinite scroll)
  └─ Click order → Show OrderDetails modal
      ├─ View details
      ├─ Edit order → PUT /api/orders/:id → Cache invalidates → Auto-refresh
      └─ Duplicate order → Navigate to Create Order with prefilled data
```

### 4. Item Management Flow
```
Navigate to "Browse Items"
  ↓
Fetch items (GET /api/items?page=1&limit=20)
  ↓
Display items in grid with images
  ├─ Edit item → Update modal → PUT /api/items/:id
  ├─ Delete item → Soft delete → POST /api/items/:id (sets deletedAt)
  └─ Copy item → Navigate to Create Item with prefilled data

Navigate to "Manage Deleted Items"
  ↓
Fetch deleted items (GET /api/items/deleted)
  ↓
Display soft-deleted items
  ├─ Restore → POST /api/items/:id/restore
  └─ Permanently delete image → DELETE /api/items/:id/permanent
```

### 5. Priority Notification Flow
```
App loads → Fetch priority orders (GET /api/orders/priority)
  ↓
Display bell icon with badge count
  ↓
Click bell → Open PriorityNotificationPanel
  ↓
Show critical/high priority orders sorted by delivery date
  ├─ Click "View Order" → Navigate to Order History with order selected
  └─ Click "Refresh" → Re-fetch priority orders
```

### 6. Sales Report Flow
```
Navigate to "Sales Report"
  ↓
Select time range (today, last 7/30/90 days, custom)
  ↓
Fetch orders in range (GET /api/orders?startDate=X&endDate=Y)
  ↓
Calculate metrics:
  ├─ Total revenue, order count, average order value
  ├─ Revenue by source (Instagram, WhatsApp, Direct, etc.)
  ├─ Top customers by purchase value
  └─ Top selling items
  ↓
Display charts and tables
```

---

## API Integration

### Service Layer Architecture
The `services/api.ts` file provides a centralized API client with:

1. **Base URL Configuration**
   ```typescript
   const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
   ```

2. **Auth Token Injection**
   ```typescript
   setAccessTokenGetter(async () => accessToken);
   setOnUnauthorizedCallback(() => logout());
   ```
   - AuthContext registers token getter on mount
   - All API calls automatically include `Authorization: Bearer <token>` header

3. **Guest Mode Support**
   ```typescript
   setGuestModeChecker(() => guestMode);
   ```
   - When guest mode is active, API calls return mock empty data
   - Prevents actual API calls to backend

### API Endpoints Used

#### Items
- `GET /api/items?page=1&limit=20` - Paginated items
- `GET /api/items/deleted?page=1&limit=20` - Soft-deleted items
- `POST /api/items` - Create item (multipart/form-data)
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Soft delete item
- `POST /api/items/:id/restore` - Restore soft-deleted item
- `DELETE /api/items/:id/permanent` - Delete image from soft-deleted item

#### Orders
- `GET /api/orders/cursor?limit=10&cursor=<base64>` - Cursor pagination (infinite scroll, recommended)
- `GET /api/orders?page=1&limit=10&status=X&startDate=Y` - Offset pagination (legacy)
- `GET /api/orders/priority` - Urgent orders (priority ≥ 3, delivery soon)
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id` - Update order

**Cursor Pagination for Order History:**

The order history uses **cursor-based pagination** for infinite scroll to prevent the "jumping orders" issue and ensure stable ordering.

**How it works:**
1. Initial load: `GET /api/orders/cursor?limit=10` (no cursor)
2. Response includes `nextCursor` and `hasMore` flag
3. Load more: `GET /api/orders/cursor?limit=10&cursor=<nextCursor>`
4. Repeat until `hasMore = false`

**Implementation:**
```typescript
// In useOrderPagination hook
const { orders, hasMore, loadMore } = useOrderPagination();

// loadMore() calls:
const result = await getOrdersCursorPaginated({ 
  limit: 10, 
  cursor: nextCursor 
});

// Append new orders without re-sorting
setOrders(prev => [...prev, ...result.orders]);
setNextCursor(result.pagination.nextCursor);
setHasMore(result.pagination.hasMore);
```

**Benefits:**
- **No jumping**: Newly loaded orders always append to bottom
- **Stable ordering**: `createdAt DESC` matches backend pagination
- **No duplicates**: Cursor ensures exact continuation from last item
- **Performance**: Uses composite DB index for fast queries

**Default Sorting:**
- Frontend default: `createdAt DESC` (aligns with backend)
- Users can manually sort by other fields (disables infinite scroll)
- Manual sorting applies to already-loaded orders only


#### Feedback
- `GET /api/feedbacks?page=1&limit=10` - Paginated feedback
- `GET /api/feedbacks/stats` - Feedback statistics
- `POST /api/feedbacks/generate-token` - Generate feedback link
- `PUT /api/feedbacks/:id` - Update feedback

#### Public Endpoints (No Auth)
- `POST /api/public/feedbacks` - Submit customer feedback
- `POST /api/public/feedbacks/validate-token` - Validate feedback token
- `GET /api/health` - Health check

---

## State Management

### State Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     App.tsx (Root)                      │
│  Local State: currentRoute, items, duplicateOrderId,    │
│               selectedOrderIdFromPriority, copiedItem    │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────▼──────────┐                  ┌────────▼─────────┐
│  AuthProvider    │                  │  NotificationProv│
│  - user          │                  │  - showNotif()   │
│  - accessToken   │                  └──────────────────┘
│  - guestMode     │
│  - login/logout  │
└───────┬──────────┘
        │
┌───────▼──────────┐
│  CurrencyProvider│
│  - currency      │
│  - formatPrice() │
└──────────────────┘
```

### State Flow
1. **Global State** (Context): Auth, Currency, Notifications
2. **App-Level State** (App.tsx): Navigation, shared data (items cache)
3. **Component State** (Local): Form data, UI state, pagination
4. **Custom Hooks**: Encapsulate data fetching and complex logic

### Navigation State Management
The app uses **state-based navigation** instead of React Router:
- `currentRoute` state tracks active page
- Navigation components (`TopNavigationBar`, `NavigationDrawer`) update `currentRoute`
- App.tsx conditionally renders components based on `currentRoute`
- Benefits: Simpler Vercel deployment, no routing configuration

---

## Development Setup

### Prerequisites
- Node.js 18+
- Backend API running on `http://localhost:5000` (or configure `VITE_API_URL`)

### Installation
```bash
cd frontend
npm install
```

### Environment Variables
Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
NEXT_PUBLIC_ROLLBAR_MYAPP_UI_CLIENT_TOKEN_1765636822=optional-rollbar-token
```

### Development Server
```bash
npm run dev
# Runs on http://localhost:5173
```

### Building
```bash
npm run build
# Output: dist/
```

### Testing
```bash
# Run tests
npm test

# Run with UI
npm run test:ui

# Coverage
npm run test:coverage
```

### Linting
```bash
npm run lint
```

### Type Checking
```bash
npm run typecheck
```

### Guest Mode (for Screenshots/Demos)
1. Start frontend: `npm run dev`
2. Navigate to `http://localhost:5173`
3. Click **"Continue as Guest (View Only)"**
4. Browse UI without backend calls (empty data)

---

## Flow Diagrams

### Application Bootstrap Flow

```mermaid
graph TD
    A[Browser loads app] --> B[main.tsx]
    B --> C[Render ErrorBoundary]
    C --> D[Render QueryClientProvider]
    D --> E[Render GoogleOAuthProvider]
    E --> F[Render ThemeProvider + CssBaseline]
    F --> G[Render NotificationProvider]
    G --> H[Render App component]
    H --> I[Render AuthProvider]
    I --> J[Render CurrencyProvider]
    J --> K[Render AppContent]
    K --> L{AuthContext: isAuthenticated?}
    L -->|No| M[Render Login]
    L -->|Yes| N[Render Main App]
    N --> O[Render AppBar with Navigation]
    N --> P[Render Current Route Component]
    N --> Q[TanStack Query fetches & caches data]
    
    M --> R{User Action}
    R -->|Google Login| S[OAuth Flow]
    R -->|Guest Mode| T[Enable Guest Mode]
    S --> N
    T --> N
    
    D --> U[ReactQueryDevtools - Development only]
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Login
    participant AuthContext
    participant GoogleOAuth
    participant SessionStorage
    participant API

    User->>Login: Click "Sign in with Google"
    Login->>GoogleOAuth: Initiate OAuth
    GoogleOAuth->>User: Show consent screen
    User->>GoogleOAuth: Approve
    GoogleOAuth->>Login: Return credential (JWT)
    Login->>AuthContext: handleGoogleSuccess(credential)
    AuthContext->>AuthContext: Decode JWT, extract user info
    AuthContext->>SessionStorage: Store user + token
    AuthContext->>API: setAccessTokenGetter(() => token)
    AuthContext->>AuthContext: setIsAuthenticated(true)
    AuthContext->>Login: Trigger re-render
    Login->>User: Show App (authenticated)

    Note over User,API: Guest Mode Alternative
    User->>Login: Click "Continue as Guest"
    Login->>AuthContext: enableGuestMode()
    AuthContext->>SessionStorage: Store guestMode=true
    AuthContext->>API: setGuestModeChecker(() => true)
    AuthContext->>AuthContext: setGuestMode(true)
    AuthContext->>Login: Trigger re-render
    Login->>User: Show App (guest mode, read-only)
```

### Create Order Flow (with TanStack Query)

```mermaid
sequenceDiagram
    participant User
    participant OrderForm
    participant useCreateOrder
    participant QueryClient
    participant API
    participant Backend
    participant DB

    User->>OrderForm: Fill customer info
    User->>OrderForm: Add items (select from inventory)
    User->>OrderForm: Set delivery details
    User->>OrderForm: Set payment details
    User->>OrderForm: Click "Create Order"
    
    OrderForm->>OrderForm: Validate form data
    OrderForm->>useCreateOrder: mutate(orderData)
    useCreateOrder->>API: createOrder(orderData)
    API->>API: getAuthHeaders() - add Bearer token
    API->>Backend: POST /api/orders
    Backend->>Backend: Verify JWT token
    Backend->>DB: INSERT order + order_items
    DB->>Backend: Return created order
    Backend->>API: 201 Created { order }
    API->>useCreateOrder: Return order
    useCreateOrder->>QueryClient: invalidateQueries(['orders'])
    useCreateOrder->>QueryClient: invalidateQueries(['analytics'])
    QueryClient->>QueryClient: Mark cached data as stale
    useCreateOrder->>OrderForm: onSuccess callback
    OrderForm->>OrderForm: Show success notification
    OrderForm->>OrderForm: Clear form
    OrderForm->>User: Show success message
    
    Note over QueryClient: Next query fetch will get fresh data
```

### Order History with Cursor Pagination (Infinite Scroll)

```mermaid
sequenceDiagram
    participant User
    participant OrderHistory
    participant useOrderPagination
    participant useOrderFilters
    participant API
    participant Backend
    participant DB

    User->>OrderHistory: Navigate to Order History
    OrderHistory->>useOrderPagination: Initialize
    OrderHistory->>useOrderFilters: Initialize (default: createdAt DESC)
    
    useOrderPagination->>API: getOrdersCursorPaginated({ limit: 10, cursor: null })
    API->>Backend: GET /api/orders/cursor?limit=10
    Backend->>DB: SELECT * FROM orders ORDER BY created_at DESC, id DESC LIMIT 11
    DB->>Backend: Return 11 orders (limit+1 to check hasMore)
    Backend->>Backend: Take first 10, encode cursor from last item
    Backend->>API: Return { orders: [...10], pagination: { nextCursor, hasMore: true } }
    API->>useOrderPagination: Return paginated orders
    useOrderPagination->>OrderHistory: Update orders state
    OrderHistory->>User: Display orders (newest first)

    User->>OrderHistory: Scroll to bottom
    OrderHistory->>OrderHistory: Trigger "Load More"
    OrderHistory->>useOrderPagination: loadMore()
    useOrderPagination->>API: getOrdersCursorPaginated({ limit: 10, cursor: nextCursor })
    API->>Backend: GET /api/orders/cursor?limit=10&cursor=<base64>
    Backend->>Backend: Decode cursor: { createdAt, id }
    Backend->>DB: SELECT * WHERE (created_at, id) < (cursor) ORDER BY ... LIMIT 11
    DB->>Backend: Return next 11 orders
    Backend->>API: Return { orders: [...10], pagination: { nextCursor, hasMore } }
    API->>useOrderPagination: Return next page
    useOrderPagination->>useOrderPagination: Append orders (no re-sorting)
    useOrderPagination->>OrderHistory: Update orders state
    OrderHistory->>User: Display appended orders

    Note over User,OrderHistory: Client-side filtering/sorting
    User->>OrderHistory: Apply filter (e.g., status=completed)
    OrderHistory->>useOrderFilters: Filter loaded orders client-side
    useOrderFilters->>OrderHistory: Return filtered subset
    OrderHistory->>User: Display filtered orders
    
    User->>OrderHistory: Click column header to sort
    OrderHistory->>useOrderFilters: Sort loaded orders client-side
    useOrderFilters->>OrderHistory: Return sorted orders
    OrderHistory->>User: Display sorted orders (infinite scroll disabled)
```

### Priority Notification Flow

```mermaid
sequenceDiagram
    participant App
    participant PriorityPanel
    participant usePriorityOrders
    participant API
    participant Backend

    App->>usePriorityOrders: Initialize on mount
    usePriorityOrders->>API: getPriorityOrders()
    API->>Backend: GET /api/orders/priority
    Note over Backend: Filter: priority >= 3<br/>OR deliveryDate within 3 days
    Backend->>API: Return priority orders
    API->>usePriorityOrders: Return urgent orders
    usePriorityOrders->>PriorityPanel: Update urgentOrders state
    PriorityPanel->>App: Show badge with count
    
    Note over App,PriorityPanel: User clicks bell icon
    App->>PriorityPanel: Open drawer
    PriorityPanel->>App: Display urgent orders list
    
    Note over App,PriorityPanel: User clicks "View Order"
    PriorityPanel->>App: onViewOrder(orderId)
    App->>App: setCurrentRoute('order-history')
    App->>App: setSelectedOrderIdFromPriority(orderId)
    App->>OrderHistory: Render with selected order
    OrderHistory->>OrderHistory: Open OrderDetails modal
```

### Item Creation with Image Upload

```mermaid
sequenceDiagram
    participant User
    participant CreateItem
    participant useImageProcessing
    participant BrowserCompression
    participant API
    participant Backend
    participant VercelBlob
    participant DB

    User->>CreateItem: Fill item details
    User->>CreateItem: Select image file
    CreateItem->>useImageProcessing: processImage(file)
    useImageProcessing->>BrowserCompression: compress(file, options)
    BrowserCompression->>useImageProcessing: Return compressed image
    useImageProcessing->>CreateItem: Return processed image
    CreateItem->>CreateItem: Show preview
    
    User->>CreateItem: Click "Create Item"
    CreateItem->>CreateItem: Validate form
    CreateItem->>API: createItem(formData)
    Note over API: FormData with image file
    API->>Backend: POST /api/items (multipart/form-data)
    Backend->>VercelBlob: Upload image
    VercelBlob->>Backend: Return image URL
    Backend->>DB: INSERT item with imageUrl
    DB->>Backend: Return created item
    Backend->>API: 201 Created { item }
    API->>CreateItem: Return item
    CreateItem->>CreateItem: Show success notification
    CreateItem->>CreateItem: Clear form
    CreateItem->>User: Show success message
```

### Component Hierarchy

```mermaid
graph TD
    A[main.tsx] --> B[ErrorBoundary]
    B --> C[GoogleOAuthProvider]
    C --> D[ThemeProvider]
    D --> E[NotificationProvider]
    E --> F[App]
    
    F --> G[AuthProvider]
    G --> H[CurrencyProvider]
    H --> I[AppContent]
    
    I --> J{isAuthenticated?}
    J -->|No| K[Login]
    J -->|Yes| L[Main UI]
    
    L --> M[AppBar]
    M --> N[TopNavigationBar]
    M --> O[PriorityNotificationPanel]
    M --> P[User Avatar + Logout]
    
    L --> Q[NavigationDrawer - Mobile]
    
    L --> R{Current Route}
    R -->|create-order| S[OrderForm]
    R -->|order-history| T[OrderHistory]
    R -->|browse-items| U[BrowseItems]
    R -->|create-item| V[CreateItem]
    R -->|manage-deleted-items| W[ManageDeletedItems]
    R -->|sales-report| X[SalesReport]
    R -->|customer-feedback| Y[FeedbackPanel]
    
    T --> T1[OrderDetails - Modal]
    U --> U1[ItemPanel - Modal]
    Y --> Y1[FeedbackDialog - Modal]
```

### State Management Flow

```mermaid
graph LR
    A[User Action] --> B{Where?}
    
    B -->|Auth| C[AuthContext]
    C --> D[Update accessToken]
    C --> E[Update user]
    C --> F[Update guestMode]
    
    B -->|Currency| G[CurrencyContext]
    G --> H[Update currency]
    
    B -->|Notification| I[NotificationContext]
    I --> J[Show Snackbar]
    
    B -->|Navigation| K[App State]
    K --> L[Update currentRoute]
    
    B -->|Component| M[Local State]
    M --> N[Form data]
    M --> O[UI state]
    M --> P[Pagination]
    
    B -->|API Data - Query| Q[TanStack Query Hook]
    Q --> R[Check cache]
    R -->|Fresh| S[Return cached data]
    R -->|Stale| T[Fetch from API]
    T --> U[Update cache]
    U --> V[Re-render component]
    
    B -->|API Data - Mutation| W[TanStack Mutation Hook]
    W --> X[Call API]
    X --> Y[Invalidate cache]
    Y --> Z[Re-fetch affected queries]
```

### TanStack Query Data Caching Flow

```mermaid
sequenceDiagram
    participant Component
    participant useItemsQuery
    participant QueryClient
    participant Cache
    participant API
    participant Backend

    Component->>useItemsQuery: Call hook
    useItemsQuery->>QueryClient: Request data for key ['items']
    QueryClient->>Cache: Check cache
    
    alt Cache Hit & Fresh (< 2 min)
        Cache->>QueryClient: Return cached data
        QueryClient->>useItemsQuery: Return cached data
        useItemsQuery->>Component: Render with cached data
    else Cache Hit & Stale (> 2 min)
        Cache->>QueryClient: Return stale data
        QueryClient->>useItemsQuery: Return stale data (loading: false)
        useItemsQuery->>Component: Render with stale data
        QueryClient->>API: Background fetch
        API->>Backend: GET /api/items
        Backend->>API: Return fresh data
        API->>QueryClient: Update cache
        QueryClient->>useItemsQuery: Return fresh data
        useItemsQuery->>Component: Re-render with fresh data
    else Cache Miss
        QueryClient->>useItemsQuery: Return loading state
        useItemsQuery->>Component: Render loading indicator
        QueryClient->>API: Fetch data
        API->>Backend: GET /api/items
        Backend->>API: Return data
        API->>QueryClient: Store in cache
        QueryClient->>useItemsQuery: Return data
        useItemsQuery->>Component: Render with data
    end
    
    Note over Cache: Data kept for 15 minutes (gcTime)
    Note over Cache: Fresh for 2 minutes (staleTime)
```

---

## Key Features

### 1. TanStack Query Client-Side Caching
- **Purpose**: Reduce API calls, improve performance, provide instant UI feedback
- **Benefits**:
  - **Instant Loading**: Show cached data immediately while fetching fresh data in background
  - **Smart Caching**: Data stays fresh for 2 minutes, cached for 15 minutes
  - **Auto-Invalidation**: Mutations automatically invalidate related caches
  - **Optimistic Updates**: UI updates instantly before API confirmation
  - **Background Refetch**: Auto-refetch on window focus and reconnect
- **Implementation**:
  - Query hooks for read operations (`useItems`, `useOrdersPaginated`, etc.)
  - Mutation hooks for write operations (`useCreateOrder`, `useUpdateItem`, etc.)
  - Centralized query key factory for consistent cache keys
  - DevTools available in development for cache inspection

### 2. Guest Mode
- **Purpose**: View UI without authentication or API calls
- **Use Cases**: Screenshots, demos, UI testing
- **Implementation**: 
  - Click "Continue as Guest" on login page
  - `AuthContext` sets `guestMode = true`
  - `api.ts` checks guest mode and returns mock empty data
  - All API calls are intercepted

### 3. State-Based Navigation
- **Why**: Vercel compatibility, simpler than React Router
- **How**: 
  - `currentRoute` state in App.tsx
  - Navigation components update `currentRoute`
  - App.tsx conditionally renders components
- **Benefits**: No routing configuration, full control

### 4. Priority Notifications
- **Purpose**: Alert users to urgent orders
- **Criteria**: Priority ≥ 3 OR delivery within 3 days
- **UI**: Bell icon with badge count in header
- **Features**: Auto-refresh, view order details
- **Caching**: Uses `usePriorityOrdersQuery` with auto-refetch

### 5. Multi-Currency Support
- **Currencies**: USD, EUR, GBP, INR
- **Storage**: localStorage persistence
- **Formatting**: Automatic price formatting with symbols

### 6. Image Upload Optimization
- **Compression**: Browser-side compression before upload
- **Storage**: Vercel Blob Storage
- **Soft Delete**: Images retained for soft-deleted items

### 7. Responsive Design
- **Breakpoints**: xs, sm, md, lg, xl (Material-UI)
- **Mobile**: Side drawer navigation
- **Desktop**: Top navigation tabs
- **Adaptive**: Components adjust layout based on screen size

---

## Best Practices

### Component Design
- Use functional components with hooks
- Extract complex logic into custom hooks
- Keep components focused and single-responsibility
- Use TypeScript for type safety

### State Management
- Use Context for global state (Auth, Currency, Notifications)
- Use local state for component-specific data
- Use TanStack Query for server state (API data)
- Use custom hooks to encapsulate data fetching logic
- Avoid prop drilling with Context

### API Integration
- Centralize API calls in `services/api.ts`
- Use auth token injection via `setAccessTokenGetter()`
- Prefer TanStack Query hooks over direct API calls
- Use query hooks for reads, mutation hooks for writes
- Handle errors consistently with mutation `onError` callbacks
- Show user-friendly notifications

### Data Fetching with TanStack Query
- **Read Operations**: Use query hooks (`useItems`, `useOrders`, etc.)
- **Write Operations**: Use mutation hooks (`useCreateItem`, `useUpdateOrder`, etc.)
- **Cache Keys**: Use centralized `queryKeys` factory for consistency
- **Invalidation**: Mutations auto-invalidate related queries
- **Optimistic Updates**: Consider optimistic updates for better UX
- **Error Handling**: Leverage built-in retry and error state

### Performance
- Use TanStack Query caching to reduce API calls
- Use pagination for large lists (with `placeholderData` to show previous page while fetching)
- Implement infinite scroll where appropriate
- Compress images before upload
- Leverage background refetching on window focus

### Testing
- Write unit tests for custom hooks
- Write integration tests for components
- Mock TanStack Query hooks in tests
- Use React Testing Library
- Test error and loading states

---

## Additional Resources

- [Material-UI Documentation](https://mui.com/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Backend API Documentation](./backend.md)
