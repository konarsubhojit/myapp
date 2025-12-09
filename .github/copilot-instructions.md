# Copilot Instructions

## Project Overview

This is an **Order Management System** - a full-stack application for managing orders with a React frontend and Node.js/PostgreSQL backend.

### Key Features
- Order Management: Create orders with customer information and multiple items
- Item Management: Add and manage items with name and price
- Order Tracking: Auto-generated order IDs and total price calculation
- Order History: View all past orders
- Authentication: Google OAuth with JWT tokens
- Delivery Tracking: Track shipments with status, AWB numbers, and delivery partners
- Priority Dashboard: Visual indicators for urgent orders based on delivery dates
- Sales Reports: Analyze sales by time, customer, and source
- Image Upload: Vercel Blob Storage for item images
- Soft Delete: Restore accidentally deleted items
- Multi-Currency: Support for multiple currencies (USD, EUR, GBP, INR)

## Tech Stack

- **Frontend**: React 19 with Vite and Material-UI (MUI) v6
- **Backend**: Node.js with Express
- **Database**: Neon PostgreSQL (serverless) with Drizzle ORM
- **Authentication**: Google OAuth with JWT
- **Image Storage**: Vercel Blob Storage
- **Testing**: Jest (backend), Vitest (frontend)
- **Linting**: ESLint

## Project Structure

```
├── backend/           # Node.js/Express API server
│   ├── db/            # Database connection and schema (Drizzle ORM)
│   ├── models/        # Data models with Drizzle queries (Item.js, Order.js)
│   ├── routes/        # Express routes (items.js, orders.js)
│   ├── middleware/    # Authentication and other middleware
│   ├── constants/     # Shared constants
│   ├── utils/         # Utility functions (logger, etc.)
│   ├── __tests__/     # Jest test files
│   ├── server.js      # Main server entry point
│   └── package.json
├── frontend/          # React/Vite application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── services/    # API service layer
│   │   ├── hooks/       # Custom React hooks
│   │   ├── contexts/    # React Context providers (Auth, Currency, Notification)
│   │   ├── config/      # Configuration files
│   │   ├── test/        # Vitest test files
│   │   ├── utils/       # Utility functions
│   │   ├── App.jsx      # Main App component
│   │   └── main.jsx     # Entry point
│   └── package.json
└── package.json       # Root package.json with workspace scripts
```

## Development Commands

### Installation
```bash
# Install all dependencies (both frontend and backend)
npm run install:all
```

### Running the Application
```bash
# Start the backend server (runs on http://localhost:5000)
npm run backend

# Start the frontend dev server (runs on http://localhost:5173)
npm run frontend
```

### Guest Mode for Development/Screenshots
The application includes a **Guest Mode** feature that allows you to view the UI without making real API calls. This is useful for:
- Taking screenshots during development
- Testing UI/UX without a backend connection
- Demonstrating the interface to stakeholders

To enable Guest Mode:
1. Start the frontend dev server: `npm run frontend`
2. Navigate to `http://localhost:5173`
3. Click the **"Continue as Guest (View Only)"** button on the login page
4. You can now browse the UI without authentication or API calls

**Note**: In Guest Mode, all API calls are intercepted and return empty data, so you'll see empty lists and forms but can still navigate the interface.

### Frontend Commands
```bash
cd frontend
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
npm test         # Run tests with Vitest
npm run test:coverage  # Run tests with coverage
```

### Backend Commands
```bash
cd backend
npm start        # Start the server
npm run dev      # Start the server (same as npm start)
npm test         # Run tests with Jest
npm run test:coverage  # Run tests with coverage
```

## Code Style Guidelines

### JavaScript/React
- Use ES modules (`import`/`export`)
- Use functional React components with hooks
- Use `.jsx` extension for React components
- Follow ESLint rules configured in `frontend/eslint.config.js`
- Use Material-UI (MUI) components for UI elements

### Backend
- Use Express for routing
- Use Drizzle ORM for PostgreSQL interactions
- Keep routes in separate files under `backend/routes/`
- Keep models in separate files under `backend/models/`
- Database schema defined in `backend/db/schema.js`
- Use structured logging via `backend/utils/logger.js`

### General
- Use meaningful variable and function names
- Keep functions small and focused
- Add appropriate error handling
- Use async/await for asynchronous operations

## API Endpoints

### Items
- `GET /api/items` - Get all items (with pagination support)
- `GET /api/items/deleted` - Get soft-deleted items (with pagination)
- `POST /api/items` - Create a new item (multipart/form-data for image upload)
- `PUT /api/items/:id` - Update an item
- `DELETE /api/items/:id` - Soft delete an item
- `POST /api/items/:id/restore` - Restore a soft-deleted item
- `DELETE /api/items/:id/permanent` - Permanently remove image from soft-deleted item

### Orders
- `GET /api/orders` - Get all orders (with pagination support)
- `GET /api/orders/priority` - Get priority orders based on delivery dates
- `POST /api/orders` - Create a new order
- `GET /api/orders/:id` - Get a specific order
- `PUT /api/orders/:id` - Update an order

### Health
- `GET /api/health` - Health check endpoint (no authentication required)

## Environment Variables

The backend requires a `.env` file with:
- `NEON_DATABASE_URL` - Neon PostgreSQL connection string
- `PORT` - Server port (default: 5000)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob Storage token for image uploads
- `AUTH_DISABLED` - Set to 'true' to disable authentication in development (optional)

The frontend requires a `.env` file with:
- `VITE_API_URL` - Backend API URL (default: http://localhost:5000/api)
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID

Copy `backend/.env.example` to `backend/.env` and configure appropriately.
Copy `frontend/.env.example` to `frontend/.env` and configure appropriately.

## Authentication

The application uses Google OAuth for authentication:
- All API endpoints except `/api/health` require authentication
- Authentication is handled via JWT tokens in the Authorization header
- Frontend uses `@react-oauth/google` for OAuth integration
- Backend uses `express-oauth2-jwt-bearer` for JWT validation
- For development, set `AUTH_DISABLED=true` in backend `.env` to bypass authentication
- Guest mode is available in the frontend for view-only access without authentication

## Testing

When adding new features:
- Write tests for new functionality
- Backend: Use Jest for unit and integration tests (`npm test`)
- Frontend: Use Vitest with React Testing Library (`npm test`)
- Ensure the application builds without errors
- Run linting before committing: `cd frontend && npm run lint`
- Manually test the feature in the browser
- Test API endpoints with appropriate HTTP methods
- Run tests with coverage to ensure adequate test coverage
- Always use sonarqube MCP to review code changes and fix them

## Common Tasks

### Adding a New React Component
1. Create the component file in `frontend/src/components/`
2. Use the `.jsx` extension
3. Export the component as default or named export
4. Import and use in parent components

### Adding a New API Endpoint
1. Add the route handler in the appropriate file under `backend/routes/`
2. If needed, create or update models in `backend/models/`
3. Register routes in `backend/server.js` if it's a new route file
4. Update constants in `backend/constants/` if needed
5. Add validation logic following existing patterns
6. Write tests in `backend/__tests__/routes/`
7. Update API service in `frontend/src/services/api.js`

### Adding a New Data Model
1. Define the schema using Drizzle ORM in `backend/db/schema.js`
2. Create the model file in `backend/models/`
3. Implement CRUD operations using Drizzle queries
4. Export the model methods
5. Add tests in `backend/__tests__/models/`

### Working with Custom Hooks
1. Create hooks in `frontend/src/hooks/`
2. Extract complex component logic into custom hooks
3. Use hooks for data fetching, form handling, and state management
4. Export hooks from `frontend/src/hooks/index.js`
5. Write tests in `frontend/src/test/hooks/`

### Working with Context
1. Create context providers in `frontend/src/contexts/`
2. Use for global state (authentication, notifications, currency)
3. Wrap components with providers in App.jsx
4. Access context using `useContext` hook
5. Write tests for context providers
