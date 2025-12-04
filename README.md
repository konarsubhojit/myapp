# Order Management System

A full-stack application for managing orders with React frontend and Node.js/PostgreSQL backend.

## Features

- **Order Management**: Create orders with customer information and multiple items
- **Item Management**: Add and manage items with name and price
- **Order Tracking**: Auto-generated order IDs and total price calculation
- **Order History**: View all past orders

## Tech Stack

- **Frontend**: React (Vite)
- **Backend**: Node.js, Express
- **Database**: Neon PostgreSQL (with Drizzle ORM)
- **Deployment**: Vercel

## Prerequisites

- Node.js (v18 or higher)
- Neon PostgreSQL database (https://neon.tech)

## Installation

1. Install all dependencies:
```bash
npm run install:all
```

Or install separately:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

2. Set up environment variables:
```bash
# Copy the example env file
cp backend/.env.example backend/.env
# Edit backend/.env with your Neon PostgreSQL connection string
```

3. Run database migrations:
```bash
cd backend
npm run migrate
```

## Running the Application

1. Start the backend server:
```bash
npm run backend
```
Backend will run on http://localhost:5000

2. In a separate terminal, start the frontend:
```bash
npm run frontend
```
Frontend will run on http://localhost:5173

## API Endpoints

### Items
- `GET /api/items` - Get all items
- `POST /api/items` - Create a new item
- `DELETE /api/items/:id` - Delete an item

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create a new order
- `GET /api/orders/:id` - Get a specific order

## Order Form Fields

- **Order Source**: Instagram, Facebook, WhatsApp, Call, or Offline
- **Customer Name**: Name of the customer
- **Customer ID**: Instagram ID, phone number, etc.
- **Items**: Select items with quantity

## Environment Variables

For Vercel deployment, set the following environment variables:

- `DATABASE_URL` - Neon PostgreSQL connection string (pooled)

Example:
```
DATABASE_URL=postgresql://neondb_owner:xxxx@ep-xxx-pooler.aws.neon.tech/neondb?sslmode=require
```

## Project Structure

```
├── backend/
│   ├── db/
│   │   ├── connection.js  # Database connection (Neon/Drizzle)
│   │   ├── schema.js      # Drizzle table schemas
│   │   └── migrate.js     # Database migration script
│   ├── models/
│   │   ├── Item.js
│   │   └── Order.js
│   ├── routes/
│   │   ├── items.js
│   │   └── orders.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ItemPanel.jsx
│   │   │   └── OrderForm.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── package.json
```
