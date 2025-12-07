# Copilot Instructions

## Project Overview

This is an **Order Management System** - a full-stack application for managing orders with a React frontend and Node.js/MongoDB backend.

### Key Features
- Order Management: Create orders with customer information and multiple items
- Item Management: Add and manage items with name and price
- Order Tracking: Auto-generated order IDs and total price calculation
- Order History: View all past orders

## Tech Stack

- **Frontend**: React 19 with Vite
- **Backend**: Node.js with Express
- **Database**: MongoDB with Mongoose ODM
- **Linting**: ESLint

## Project Structure

```
├── backend/           # Node.js/Express API server
│   ├── models/        # Mongoose models (Item.js, Order.js)
│   ├── routes/        # Express routes (items.js, orders.js)
│   ├── server.js      # Main server entry point
│   └── package.json
├── frontend/          # React/Vite application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── services/    # API service layer
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
```

### Backend Commands
```bash
cd backend
npm start        # Start the server
npm run dev      # Start the server (same as npm start)
```

## Code Style Guidelines

### JavaScript/React
- Use ES modules (`import`/`export`)
- Use functional React components with hooks
- Use `.jsx` extension for React components
- Follow ESLint rules configured in `frontend/eslint.config.js`

### Backend
- Use Express for routing
- Use Mongoose for MongoDB interactions
- Keep routes in separate files under `backend/routes/`
- Keep models in separate files under `backend/models/`

### General
- Use meaningful variable and function names
- Keep functions small and focused
- Add appropriate error handling
- Use async/await for asynchronous operations

## API Endpoints

### Items
- `GET /api/items` - Get all items
- `POST /api/items` - Create a new item
- `DELETE /api/items/:id` - Delete an item

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create a new order
- `GET /api/orders/:id` - Get a specific order

## Environment Variables

The backend requires a `.env` file with:
- `MONGODB_URI` - MongoDB connection string
- `PORT` - Server port (default: 5000)

Copy `backend/.env.example` to `backend/.env` and configure appropriately.

## Testing

When adding new features:
- Ensure the application builds without errors
- Run linting before committing: `cd frontend && npm run lint`
- Manually test the feature in the browser
- Test API endpoints with appropriate HTTP methods
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

### Adding a New Mongoose Model
1. Create the model file in `backend/models/`
2. Define the schema using Mongoose
3. Export the model
