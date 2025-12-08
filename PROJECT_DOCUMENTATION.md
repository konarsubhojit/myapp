# Order Management System - Complete Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Installation & Setup](#installation--setup)
5. [Running the Application](#running-the-application)
6. [Project Structure](#project-structure)
7. [API Documentation](#api-documentation)
8. [Database Schema](#database-schema)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Development Guidelines](#development-guidelines)

---

## Project Overview

The Order Management System is a full-stack application designed for managing orders in a clothing/fashion business. It provides comprehensive tools for managing inventory, creating orders, tracking deliveries, and analyzing sales data.

### Key Capabilities
- **Order Management**: Create, edit, and track orders with multiple items
- **Inventory Management**: Manage items with images, colors, fabrics, and pricing
- **Delivery Tracking**: Track delivery status with AWB numbers and delivery partners
- **Sales Analytics**: Comprehensive reports by time period, customer, and source
- **Priority Dashboard**: Visual priority indicators based on delivery dates
- **Authentication**: Google OAuth integration with guest mode support
- **Multi-Currency**: Support for multiple currencies (USD, EUR, GBP, INR)

---

## Features

### Core Features

#### 1. Order Management
- Create orders with customer information and multiple items
- Auto-generated order IDs (ORD######)
- Order status tracking (pending, processing, completed, cancelled)
- Payment status tracking (unpaid, partially paid, paid)
- Customer confirmation status tracking
- Order duplication for repeat customers
- Priority levels (0-5) for urgent orders
- Customer notes and delivery addresses

#### 2. Item Management
- Add items with name, price, color, fabric, and special features
- Image upload with preview (Vercel Blob Storage)
- Soft delete with restore capability
- Permanent image deletion for soft-deleted items
- Item search and filtering
- Pagination for large inventories

#### 3. Delivery Tracking
- 6 delivery statuses: Not Shipped, Shipped, In Transit, Out for Delivery, Delivered, Returned
- Tracking ID/AWB number support
- Flexible delivery partner field (no enum restrictions)
- Actual delivery date recording
- Visual status indicators with color coding

#### 4. Sales Reports
- Time-based filtering (today, last 7/30/90 days, custom range)
- Order source breakdown (Instagram, WhatsApp, Direct, etc.)
- Customer purchase history
- Item-wise sales analysis
- Revenue calculations with multi-currency support

#### 5. Priority Dashboard
- Visual priority indicators based on delivery dates
- Color-coded priorities: Overdue (red), Critical (red), Urgent (orange), Medium (blue), Normal (green)
- Priority calculation based on 1-2 week production timeline
- Notifications for high-priority orders

### Additional Features

- **Authentication**: Google OAuth with JWT tokens
- **Guest Mode**: View-only mode for demos/screenshots
- **Responsive Design**: Mobile-friendly Material-UI interface
- **Real-time Notifications**: Success/error messages for user actions
- **URL State Management**: Shareable URLs with filter/pagination state
- **Dark/Light Theme**: Support for theme customization

---

## Tech Stack

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI) v6
- **Routing**: React Router v6
- **State Management**: React Context API
- **HTTP Client**: Native Fetch API
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint

### Backend
- **Runtime**: Node.js v18+
- **Framework**: Express.js
- **Database**: Neon PostgreSQL (serverless)
- **ORM**: Drizzle ORM
- **Authentication**: Google OAuth + JWT
- **Image Storage**: Vercel Blob Storage
- **Testing**: Jest + Supertest
- **Logging**: Winston-like custom logger

### Deployment
- **Platform**: Vercel (both frontend and backend)
- **CI/CD**: GitHub Actions
- **Code Quality**: SonarQube integration
- **Security**: CodeQL scanning
- **Containerization**: Docker support for Azure/AWS/GCP

---

## Installation & Setup

### Prerequisites
- Node.js v18 or higher
- Neon PostgreSQL account (https://neon.tech)
- Vercel Blob Storage account (for images)
- Google OAuth credentials (for authentication)

### Step 1: Clone Repository
```bash
git clone https://github.com/konarsubhojit/Order-Management.git
cd Order-Management
```

### Step 2: Install Dependencies
```bash
# Install all dependencies (backend + frontend)
npm run install:all

# Or install separately
cd backend && npm install
cd ../frontend && npm install
```

### Step 3: Configure Environment Variables

#### Backend Configuration
Create `backend/.env`:
```env
# Database
NEON_DATABASE_URL=postgresql://user:password@host.neon.tech/database?sslmode=require

# Server
PORT=5000
NODE_ENV=development

# Authentication
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
AUTH_DISABLED=false  # Set to 'true' to disable auth in development

# Image Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
```

#### Frontend Configuration
Create `frontend/.env`:
```env
# API Configuration
VITE_API_URL=http://localhost:5000/api

# Authentication
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### Step 4: Database Migration
```bash
# The schema is auto-applied by Drizzle ORM on first run
# No manual migration needed for new installations

# For existing databases, migration scripts are in backend/db/migrations/
```

---

## Running the Application

### Development Mode

#### Terminal 1: Start Backend
```bash
npm run backend
# Backend runs on http://localhost:5000
```

#### Terminal 2: Start Frontend
```bash
npm run frontend
# Frontend runs on http://localhost:5173
```

### Production Build

#### Frontend
```bash
cd frontend
npm run build
npm run preview
```

#### Backend
```bash
cd backend
npm start
```

### Guest Mode (Development/Screenshots)
1. Navigate to http://localhost:5173
2. Click "Continue as Guest (View Only)"
3. Browse UI without authentication or API calls

---

## Project Structure

```
Order-Management/
├── backend/
│   ├── __tests__/              # Test files (Jest)
│   │   ├── models/             # Model tests
│   │   ├── routes/             # Route tests
│   │   ├── middleware/         # Middleware tests
│   │   └── utils/              # Utility tests
│   ├── constants/              # Shared constants
│   │   └── orderConstants.js   # Order status/validation constants
│   ├── db/                     # Database
│   │   ├── connection.js       # Database connection
│   │   ├── schema.js           # Drizzle schema definitions
│   │   └── migrations/         # SQL migration scripts
│   ├── middleware/             # Express middleware
│   │   └── auth.js             # Authentication middleware
│   ├── models/                 # Data models
│   │   ├── Item.js             # Item CRUD operations
│   │   └── Order.js            # Order CRUD operations
│   ├── routes/                 # API routes
│   │   ├── items.js            # Item endpoints
│   │   └── orders.js           # Order endpoints
│   ├── utils/                  # Utilities
│   │   └── logger.js           # Logging utility
│   ├── .env                    # Environment variables (not in repo)
│   ├── jest.config.js          # Jest configuration
│   ├── package.json            # Backend dependencies
│   └── server.js               # Server entry point
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── common/         # Reusable components
│   │   │   ├── App.jsx         # Main app component
│   │   │   ├── ItemPanel.jsx   # Item management
│   │   │   ├── OrderForm.jsx   # Order creation
│   │   │   ├── OrderHistory.jsx # Order list
│   │   │   ├── OrderDetails.jsx # Order view/edit
│   │   │   ├── SalesReport.jsx # Sales analytics
│   │   │   ├── PriorityDashboard.jsx # Priority view
│   │   │   ├── Login.jsx       # Authentication
│   │   │   └── CurrencySelector.jsx # Currency switcher
│   │   ├── config/             # Configuration
│   │   │   ├── authConfig.js   # Auth settings
│   │   │   ├── theme.js        # MUI theme
│   │   │   └── version.js      # App version
│   │   ├── constants/          # Frontend constants
│   │   │   └── orderConstants.js # Order constants
│   │   ├── contexts/           # React contexts
│   │   │   ├── AuthContext.jsx # Authentication state
│   │   │   ├── CurrencyContext.jsx # Currency state
│   │   │   └── NotificationContext.jsx # Notifications
│   │   ├── hooks/              # Custom hooks
│   │   │   ├── useOrderDetails.js # Order details logic
│   │   │   ├── useOrderFilters.js # Filtering logic
│   │   │   ├── useOrderPagination.js # Pagination logic
│   │   │   ├── useItemForm.js  # Item form logic
│   │   │   ├── useItemsData.js # Items data logic
│   │   │   ├── useDeletedItems.js # Deleted items logic
│   │   │   ├── useImageProcessing.js # Image upload logic
│   │   │   ├── useUrlSync.js   # URL state sync
│   │   │   └── index.js        # Hook exports
│   │   ├── services/           # API services
│   │   │   └── api.js          # API client
│   │   ├── test/               # Test files (Vitest)
│   │   ├── utils/              # Utility functions
│   │   │   ├── orderUtils.js   # Order utilities
│   │   │   └── priorityUtils.js # Priority calculations
│   │   └── main.jsx            # App entry point
│   ├── .env                    # Environment variables (not in repo)
│   ├── package.json            # Frontend dependencies
│   └── vitest.config.js        # Vitest configuration
├── docs/                       # Additional documentation
├── .github/
│   ├── workflows/              # GitHub Actions
│   │   └── build-and-test.yml  # CI/CD pipeline
│   └── copilot-instructions.md # Copilot guidelines
├── .gitignore                  # Git ignore rules
├── package.json                # Root package.json
├── PROJECT_DOCUMENTATION.md    # This file
├── README.md                   # Quick start guide
└── sonar-project.properties    # SonarQube config
```

---

## API Documentation

### Base URL
- **Development**: `http://localhost:5000/api`
- **Production**: `https://your-domain.vercel.app/api`

### Authentication
All endpoints except `/api/health` require authentication via JWT token in Authorization header:
```
Authorization: Bearer <jwt-token>
```

In development, set `AUTH_DISABLED=true` to bypass authentication.

### Items API

#### GET /api/items
Get all active items with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, allowed: 10, 20, 50)
- `search` (optional): Search term for item name

**Response:**
```json
{
  "items": [
    {
      "_id": 1,
      "name": "Blue Dress",
      "price": 99.99,
      "color": "Blue",
      "fabric": "Cotton",
      "specialFeatures": "Embroidered",
      "image": "https://blob.vercel-storage.com/...",
      "copiedFrom": null,
      "deleted": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5,
    "hasMore": true
  }
}
```

#### GET /api/items/deleted
Get soft-deleted items with pagination.

**Query Parameters:** Same as GET /api/items

#### POST /api/items
Create a new item.

**Request Body (multipart/form-data):**
```
name: "Blue Dress"
price: "99.99"
color: "Blue"
fabric: "Cotton"
specialFeatures: "Embroidered"
image: <file>
copiedFrom: null
```

**Response:** Returns created item object

#### PUT /api/items/:id
Update an existing item.

**Request Body:** Same as POST (all fields optional)

#### DELETE /api/items/:id
Soft delete an item (sets deleted=true).

#### POST /api/items/:id/restore
Restore a soft-deleted item.

#### DELETE /api/items/:id/permanent
Permanently remove image from a soft-deleted item (item record preserved).

### Orders API

#### GET /api/orders
Get all orders with pagination.

**Query Parameters:**
- `page`, `limit`: Same as items
- Additional filters available in frontend

**Response:**
```json
{
  "orders": [
    {
      "_id": 1,
      "orderId": "ORD123456",
      "orderFrom": "instagram",
      "customerName": "John Doe",
      "customerId": "CUST001",
      "address": "123 Main St",
      "orderDate": "2024-01-01T00:00:00.000Z",
      "expectedDeliveryDate": "2024-01-15T00:00:00.000Z",
      "status": "pending",
      "paymentStatus": "paid",
      "paidAmount": 199.98,
      "totalPrice": 199.98,
      "confirmationStatus": "confirmed",
      "customerNotes": "Rush order",
      "priority": 4,
      "deliveryStatus": "shipped",
      "trackingId": "AWB123456789",
      "deliveryPartner": "Delhivery",
      "actualDeliveryDate": null,
      "items": [
        {
          "_id": 1,
          "item": 5,
          "quantity": 2,
          "price": 99.99,
          "customizationRequest": "Size M"
        }
      ]
    }
  ],
  "pagination": { ... }
}
```

#### GET /api/orders/:id
Get a specific order by ID.

#### POST /api/orders
Create a new order.

**Request Body:**
```json
{
  "orderFrom": "instagram",
  "customerName": "John Doe",
  "customerId": "CUST001",
  "address": "123 Main St",
  "orderDate": "2024-01-01",
  "expectedDeliveryDate": "2024-01-15",
  "items": [
    {
      "itemId": 5,
      "quantity": 2,
      "customizationRequest": "Size M"
    }
  ],
  "paymentStatus": "paid",
  "paidAmount": 199.98,
  "confirmationStatus": "confirmed",
  "customerNotes": "Rush order",
  "priority": 4
}
```

#### PUT /api/orders/:id
Update an existing order.

**Request Body:** Same structure as POST (all fields optional except items if updating)

### Health Check

#### GET /api/health
Health check endpoint (no authentication required).

**Response:**
```json
{
  "status": "ok",
  "database": "connected"
}
```

---

## Database Schema

### Tables

#### items
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| name | TEXT | NOT NULL | Item name |
| price | NUMERIC(10,2) | NOT NULL | Item price |
| color | TEXT | | Color description |
| fabric | TEXT | | Fabric type |
| special_features | TEXT | | Special features |
| image | TEXT | | Image URL (Vercel Blob) |
| copied_from | INTEGER | | ID of original item if duplicated |
| deleted | BOOLEAN | DEFAULT false | Soft delete flag |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

#### orders
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| order_id | TEXT | UNIQUE NOT NULL | Generated order ID (ORD######) |
| order_from | TEXT | NOT NULL | Order source (instagram, whatsapp, etc.) |
| customer_name | TEXT | NOT NULL | Customer full name |
| customer_id | TEXT | NOT NULL | Customer ID/code |
| address | TEXT | | Delivery address |
| order_date | TIMESTAMP | | Order creation date |
| expected_delivery_date | TIMESTAMP | | Expected delivery date |
| status | TEXT | DEFAULT 'pending' | Order status |
| payment_status | TEXT | DEFAULT 'unpaid' | Payment status |
| paid_amount | NUMERIC(10,2) | DEFAULT 0 | Amount paid |
| total_price | NUMERIC(10,2) | NOT NULL | Total order value |
| confirmation_status | TEXT | DEFAULT 'unconfirmed' | Confirmation status |
| customer_notes | TEXT | | Customer notes |
| priority | INTEGER | DEFAULT 0 | Priority level (0-5) |
| delivery_status | TEXT | DEFAULT 'not_shipped' | Delivery status |
| tracking_id | TEXT | | AWB/tracking number |
| delivery_partner | TEXT | | Delivery partner name |
| actual_delivery_date | TIMESTAMP | | Actual delivery date |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

#### order_items
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| order_id | INTEGER | FOREIGN KEY (orders.id) ON DELETE CASCADE | Order reference |
| item_id | INTEGER | NOT NULL | Item reference (no FK for historical data) |
| quantity | INTEGER | NOT NULL | Quantity ordered |
| price | NUMERIC(10,2) | NOT NULL | Price at order time |
| customization_request | TEXT | | Customization notes |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

### Indexes
- `items.deleted`: For filtering active/deleted items
- `orders.order_id`: For quick order lookup
- `orders.order_from`: For source-based filtering
- `orders.customer_id`: For customer history
- `orders.expected_delivery_date`: For priority calculations
- `order_items.order_id`: For order lookup

---

## Testing

### Backend Tests (Jest)
```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

**Test Coverage**: 83% overall
- Models: 82-86%
- Routes: 82-87%
- Middleware: 67%
- Utils: 96%

**Test Files**: 8 files, 120 tests

### Frontend Tests (Vitest)
```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Interactive UI
npm run test:ui
```

**Test Coverage**: 42% overall
- High coverage (80-100%): Hooks, utils, services, common components
- Low coverage (0%): Large page components (ItemPanel, OrderForm, etc.)

**Test Files**: 57 files, 276 tests

### Linting
```bash
cd frontend
npm run lint
```

---

## Deployment

### Vercel Deployment (Recommended)

#### Prerequisites
1. Vercel account
2. Neon PostgreSQL database
3. Vercel Blob Storage setup
4. Google OAuth credentials

#### Backend Deployment
1. Push code to GitHub
2. Import project in Vercel
3. Set root directory to `backend`
4. Add environment variables (same as `.env`)
5. Deploy

#### Frontend Deployment
1. Create new Vercel project
2. Set root directory to `frontend`
3. Add environment variables
4. Build command: `npm run build`
5. Output directory: `dist`
6. Deploy

### Docker Deployment

#### Using Docker Compose
```bash
# Copy environment template
cp .env.docker.example .env

# Edit .env with your values

# Build and run
docker-compose up --build
```

#### Manual Docker Build
```bash
# Backend
cd backend
docker build -t order-backend .
docker run -p 5000:5000 --env-file .env order-backend

# Frontend
cd frontend
docker build -t order-frontend \
  --build-arg VITE_API_URL=http://api-url/api \
  --build-arg VITE_GOOGLE_CLIENT_ID=your-client-id .
docker run -p 80:80 order-frontend
```

### GitHub Actions CI/CD

The repository includes automated workflows:

#### build-and-test.yml
- Runs on push to main/develop
- Executes all tests with coverage
- Runs ESLint
- Builds frontend
- Performs SonarQube analysis
- Checks code quality gates

#### docker-build.yml (if configured)
- Builds Docker images
- Pushes to GitHub Container Registry
- Performs security scanning with Trivy

### Environment Variables Summary

**Backend Required:**
- `NEON_DATABASE_URL`: Database connection string
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob token

**Backend Optional:**
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)
- `AUTH_DISABLED`: Disable auth for development (true/false)

**Frontend Required:**
- `VITE_GOOGLE_CLIENT_ID`: Google OAuth client ID

**Frontend Optional:**
- `VITE_API_URL`: Backend API URL (defaults to localhost:5000)

---

## Development Guidelines

### Code Style
- **JavaScript/React**: Use ES modules, functional components, hooks
- **File Extensions**: `.jsx` for React components, `.js` for utilities
- **Naming**: PascalCase for components, camelCase for variables/functions
- **Linting**: Follow ESLint rules (frontend/eslint.config.js)
- **Comments**: Minimal, only for complex logic

### Architecture Patterns
- **Custom Hooks**: Extract complex logic from components
- **Context API**: Use for global state (auth, currency, notifications)
- **Service Layer**: Centralize API calls in services/api.js
- **Helper Functions**: Extract validation and transformation logic

### Best Practices
1. **Keep Functions Small**: Single responsibility, cognitive complexity < 15
2. **Use TypeScript JSDoc**: Document function parameters and returns
3. **Error Handling**: Always handle errors gracefully
4. **Loading States**: Provide feedback during async operations
5. **Accessibility**: Use semantic HTML and ARIA labels
6. **Responsive Design**: Test on mobile and desktop
7. **Performance**: Use React.memo, useMemo, useCallback appropriately
8. **Security**: Validate all inputs, sanitize outputs

### Adding New Features
1. Create feature branch: `git checkout -b feature/your-feature`
2. Write tests first (TDD approach)
3. Implement feature with minimal changes
4. Update documentation if needed
5. Run tests and linting
6. Create pull request

### Common Tasks

#### Add New API Endpoint
1. Add route in `backend/routes/`
2. Add validation constants if needed
3. Add tests in `backend/__tests__/routes/`
4. Add API service method in `frontend/src/services/api.js`
5. Update this documentation

#### Add New Component
1. Create component in `frontend/src/components/`
2. Extract complex logic to custom hook
3. Use Material-UI components
4. Make it responsive
5. Add tests in `frontend/src/test/components/`

#### Add Database Column
1. Update schema in `backend/db/schema.js`
2. Create migration script in `backend/db/migrations/`
3. Update model transformations
4. Update API validation
5. Update frontend forms

### Troubleshooting

#### Database Connection Issues
```bash
# Test connection
node -e "require('./backend/db/connection').connectToDatabase().then(() => console.log('OK'))"
```

#### Build Failures
```bash
# Clear caches
rm -rf backend/node_modules frontend/node_modules
rm backend/package-lock.json frontend/package-lock.json
npm run install:all
```

#### CORS Errors
Check `backend/server.js` CORS configuration matches frontend URL.

#### Authentication Issues
1. Verify Google OAuth credentials
2. Check JWT token in browser DevTools
3. Ensure `AUTH_DISABLED=false` in production

---

## Version History

**Current Version**: 1.0.0

### Major Features by Version
- v1.0.0: Initial release with full order management, delivery tracking, and sales reports
- v0.9.0: Added priority dashboard and notifications
- v0.8.0: Implemented delivery tracking
- v0.7.0: Added sales reports and analytics
- v0.6.0: Implemented soft delete and restore
- v0.5.0: Added authentication with Google OAuth
- v0.4.0: Implemented order management
- v0.3.0: Added item management with images
- v0.2.0: Created basic UI with Material-UI
- v0.1.0: Initial project setup

---

## Support & Contributing

### Getting Help
- Check this documentation first
- Review GitHub issues for similar problems
- Create new issue with detailed description

### Contributing
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request
5. Maintain code quality standards

### License
This project is proprietary. All rights reserved.

---

**Last Updated**: December 2024
**Maintained by**: konarsubhojit
**Repository**: https://github.com/konarsubhojit/Order-Management
