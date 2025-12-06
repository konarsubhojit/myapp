# Order Management System

A full-stack application for managing orders with React frontend and Node.js/PostgreSQL backend.

## Features

- **Order Management**: Create orders with customer information and multiple items
- **Item Management**: Add and manage items with name, price, color, fabric, and image
- **Order Tracking**: Auto-generated order IDs and total price calculation
- **Order History**: View all past orders with filtering, sorting, and pagination
- **Sales Analytics**: Comprehensive sales reports by time period, item, customer, and source
- **Authentication**: Google OAuth integration
- **Soft Delete**: Items can be soft-deleted and restored
- **Permanent Image Deletion**: Remove images from soft-deleted items while preserving records for historical orders

## Tech Stack

- **Frontend**: React 19 with Vite
- **Backend**: Node.js with Express
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Image Storage**: Vercel Blob Storage
- **Authentication**: Google OAuth
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
cd backend && npm install
cd ../frontend && npm install
```

2. Set up environment variables:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
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
- `GET /api/items` - Get all items (supports pagination with `page` and `limit` params)
- `GET /api/items/deleted` - Get soft-deleted items
- `POST /api/items` - Create a new item
- `PUT /api/items/:id` - Update an item
- `DELETE /api/items/:id` - Soft delete an item
- `POST /api/items/:id/restore` - Restore a soft-deleted item
- `DELETE /api/items/:id/permanent` - Permanently remove image from a soft-deleted item

### Orders
- `GET /api/orders` - Get all orders (supports pagination)
- `POST /api/orders` - Create a new order
- `GET /api/orders/:id` - Get a specific order
- `PUT /api/orders/:id` - Update an order

### Health
- `GET /api/health` - Health check endpoint (no auth required)

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `NEON_DATABASE_URL` | Neon PostgreSQL connection string | Yes |
| `PORT` | Server port (default: 5000) | No |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob Storage token | Yes (for images) |
| `AUTH_DISABLED` | Set to 'true' to disable auth (dev only) | No |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Yes (for auth) |

### Frontend (`frontend/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | No (defaults to localhost) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID | Yes (for auth) |

## Project Structure

```
├── backend/
│   ├── constants/         # Shared constants
│   ├── db/                # Database connection and schema
│   ├── middleware/        # Express middleware (auth)
│   ├── models/            # Data models (Item, Order)
│   ├── routes/            # API routes
│   ├── utils/             # Utilities (logger)
│   └── server.js          # Main server entry
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── config/        # Configuration
│   │   ├── constants/     # Shared constants
│   │   ├── contexts/      # React contexts
│   │   ├── services/      # API service layer
│   │   ├── utils/         # Utility functions
│   │   ├── App.jsx        # Main App component
│   │   └── main.jsx       # Entry point
│   └── package.json
├── docs/                  # Additional documentation
└── package.json           # Root package.json with workspace scripts
```

## Development Commands

### Frontend
```bash
cd frontend
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

### Backend
```bash
cd backend
npm start        # Start the server
```

## Docker Deployment

The application is containerized and ready for deployment on cloud container platforms like Azure Container Apps, AWS ECS, Google Cloud Run, etc.

### CI/CD with GitHub Actions

The repository includes automated Docker image building via GitHub Actions:

#### Available Workflows

| Workflow | Trigger | Description |
|----------|---------|-------------|
| `docker-build.yml` | Push to `main`, tags, PRs | Builds and pushes Docker images to GitHub Container Registry |
| `deploy-azure-container-apps.yml` | Manual dispatch | Deploys images to Azure Container Apps |

#### Automatic Image Building

On every push to `main` or when a version tag (e.g., `v1.0.0`) is created:
- Docker images are automatically built for both backend and frontend
- Images are pushed to GitHub Container Registry (ghcr.io)
- Security scanning with Trivy is performed on the images

#### Pull Published Images

```bash
# Backend
docker pull ghcr.io/<your-username>/myapp-backend:latest

# Frontend
docker pull ghcr.io/<your-username>/myapp-frontend:latest
```

#### Required Repository Settings

1. **Repository Variables** (Settings → Secrets and variables → Actions → Variables):
   - `VITE_API_URL` - Backend API URL for frontend build
   - `VITE_GOOGLE_CLIENT_ID` - Google OAuth Client ID

2. **For Azure Container Apps deployment** (optional):
   - `AZURE_RESOURCE_GROUP` - Azure resource group name
   - `AZURE_BACKEND_APP_NAME` - Backend container app name
   - `AZURE_FRONTEND_APP_NAME` - Frontend container app name
   - `AZURE_CONTAINER_APP_ENVIRONMENT` - Container Apps environment name

3. **Repository Secrets** (for Azure deployment):
   - `AZURE_CREDENTIALS` - Azure service principal credentials JSON

### Quick Start with Docker Compose

1. Copy the environment template:
```bash
cp .env.docker.example .env
```

2. Edit `.env` with your actual values (database URL, OAuth credentials, etc.)

3. Build and run the containers:
```bash
docker-compose up --build
```

The application will be available at:
- Frontend: http://localhost:80
- Backend API: http://localhost:5000

### Building Individual Containers

#### Backend Container
```bash
cd backend
docker build -t order-management-backend .
docker run -p 5000:5000 \
  -e NEON_DATABASE_URL=your_database_url \
  -e GOOGLE_CLIENT_ID=your_google_client_id \
  order-management-backend
```

#### Frontend Container
```bash
cd frontend
docker build -t order-management-frontend \
  --build-arg VITE_API_URL=http://your-backend-url/api \
  --build-arg VITE_GOOGLE_CLIENT_ID=your_google_client_id .
docker run -p 80:80 order-management-frontend
```

### Cloud Container Deployment

#### Azure Container Apps
```bash
# Build and push to Azure Container Registry
az acr build --registry <your-registry> --image order-backend:latest ./backend
az acr build --registry <your-registry> --image order-frontend:latest ./frontend

# Deploy to Azure Container Apps
az containerapp create --name order-backend --resource-group <rg> \
  --image <your-registry>.azurecr.io/order-backend:latest \
  --target-port 5000 --ingress external

az containerapp create --name order-frontend --resource-group <rg> \
  --image <your-registry>.azurecr.io/order-frontend:latest \
  --target-port 80 --ingress external
```

#### Google Cloud Run
```bash
# Backend
gcloud builds submit --tag gcr.io/<project>/order-backend ./backend
gcloud run deploy order-backend --image gcr.io/<project>/order-backend --port 5000

# Frontend
gcloud builds submit --tag gcr.io/<project>/order-frontend ./frontend
gcloud run deploy order-frontend --image gcr.io/<project>/order-frontend --port 80
```

#### AWS ECS / Fargate
Build images and push to ECR, then deploy using ECS service definitions or the AWS Console.

### Container Environment Variables

See `.env.docker.example` for all available environment variables and their descriptions.

## Deployment (Vercel)

For Azure deployment setup, see [docs/AZURE_DEPLOYMENT_SETUP.md](docs/AZURE_DEPLOYMENT_SETUP.md).
