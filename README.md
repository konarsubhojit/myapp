# Order Management System

A full-stack application for managing orders with React frontend and Node.js/PostgreSQL backend.

> 📚 **For complete documentation**, see [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)

## Quick Start

### Prerequisites
- Node.js v18+
- Neon PostgreSQL database
- Vercel Blob Storage (for images)
- Google OAuth credentials

### Installation

```bash
# Clone repository
git clone https://github.com/konarsubhojit/Order-Management.git
cd Order-Management

# Install dependencies
npm run install:all

# Configure environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit .env files with your credentials
```

### Run Locally

```bash
# Terminal 1: Start backend
npm run backend
# Runs on http://localhost:5000

# Terminal 2: Start frontend
npm run frontend
# Runs on http://localhost:5173
```

## Key Features

- ✅ **Order Management** - Create and track orders with multiple items
- ✅ **Item Management** - Manage inventory with images and details
- ✅ **Delivery Tracking** - Track shipments with AWB numbers
- ✅ **Sales Reports** - Analyze sales by time, customer, and source
- ✅ **Priority Dashboard** - Visual indicators for urgent orders
- ✅ **Multi-Currency** - Support for USD, EUR, GBP, INR
- ✅ **Google OAuth** - Secure authentication
- ✅ **Soft Delete** - Restore accidentally deleted items

## Tech Stack

**Frontend**: React 19, Vite, Material-UI, React Router  
**Backend**: Node.js, Express, PostgreSQL, Drizzle ORM  
**Deployment**: Vercel, Docker support  
**Testing**: Jest (backend), Vitest (frontend)

## Project Structure

```
├── backend/          # Node.js/Express API
│   ├── models/       # Data models
│   ├── routes/       # API endpoints
│   ├── db/           # Database schema
│   └── __tests__/    # Backend tests
├── frontend/         # React application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom hooks
│   │   ├── contexts/    # Context providers
│   │   ├── services/    # API client
│   │   └── test/        # Frontend tests
│   └── ...
└── docs/            # Additional documentation
```

## API Endpoints

### Items
- `GET /api/items` - Get all items (with pagination)
- `POST /api/items` - Create item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Soft delete item
- `POST /api/items/:id/restore` - Restore item

### Orders
- `GET /api/orders` - Get all orders (with pagination)
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id` - Update order

### Health
- `GET /api/health` - Health check (no auth)

## Testing

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# With coverage
npm run test:coverage
```

## Deployment

### Vercel (Recommended)
1. Deploy backend: Set root to `backend`, add environment variables
2. Deploy frontend: Set root to `frontend`, add environment variables, set VITE_API_URL

### Docker
```bash
# Using Docker Compose
cp .env.docker.example .env
docker-compose up --build
```

## Environment Variables

**Backend** (.env):
```env
NEON_DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=...
BLOB_READ_WRITE_TOKEN=...
PORT=5000
```

**Frontend** (.env):
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=...
```

### Google OAuth Setup

To configure Google OAuth authentication:

1. **Create Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable Google OAuth**:
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application" as the application type

3. **Configure Authorized Redirect URIs**:
   - Add the following URIs based on your environment:
     - **Local Development**: `http://localhost:5173`
     - **Production**: Your deployed frontend URL (e.g., `https://your-app.vercel.app`)
   - **Important**: The redirect URI must exactly match your application URL (including protocol and port)

4. **Configure Authorized JavaScript Origins**:
   - Add the same URLs as above (without any path)
   - Example: `http://localhost:5173` and `https://your-app.vercel.app`

5. **Copy Credentials**:
   - Copy the "Client ID" 
   - Add it to both `backend/.env` (as `GOOGLE_CLIENT_ID`) and `frontend/.env` (as `VITE_GOOGLE_CLIENT_ID`)

**Troubleshooting**: If you encounter "stuck at transform URL" errors during login, verify that:
- The redirect URI is correctly configured in Google Cloud Console
- The URL matches exactly (http vs https, www vs non-www)
- Third-party cookies are not blocked in your browser

For detailed setup instructions, see [docs/google-oauth-setup.md](./docs/google-oauth-setup.md)

## Documentation

- [Complete Project Documentation](./PROJECT_DOCUMENTATION.md) - Full technical documentation
- [API Documentation](./PROJECT_DOCUMENTATION.md#api-documentation) - Detailed API reference
- [Database Schema](./PROJECT_DOCUMENTATION.md#database-schema) - Database structure
- [Development Guidelines](./PROJECT_DOCUMENTATION.md#development-guidelines) - Coding standards
- [Deployment Guide](./PROJECT_DOCUMENTATION.md#deployment) - Deployment instructions
- [Architecture Analysis](./ARCHITECTURE_ANALYSIS.md) - **NEW** ⭐ Comprehensive architecture review with optimization recommendations
- [Optimization Summary](./OPTIMIZATION_SUMMARY.md) - **NEW** ⭐ Quick reference guide for improvements

## Development

```bash
# Frontend linting
cd frontend && npm run lint

# Frontend build
cd frontend && npm run build

# Backend start
cd backend && npm start
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/your-feature`
3. Make changes with tests
4. Run tests and linting
5. Submit pull request

## Support

For issues or questions:
- Check [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)
- Search existing GitHub issues
- Create new issue with details

## License

Proprietary. All rights reserved.

---

**Version**: 1.0.0  
**Repository**: https://github.com/konarsubhojit/Order-Management  
**Author**: konarsubhojit
