# Order Management System - Frontend

React frontend for the Order Management System built with Vite.

## Environment Variables

The frontend requires configuration for connecting to the backend API. Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:5000/api` |

### Production Deployment

When deploying the frontend and backend as separate services (e.g., Azure App Services), set `VITE_API_URL` to your deployed backend URL:

```bash
VITE_API_URL=https://your-backend-app.azurewebsites.net/api
```

**Important:** Environment variables prefixed with `VITE_` are embedded into the build at build time. You must set the environment variable before running `npm run build`.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Production Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

## Tech Stack

- React 19 with Vite
- ESLint for linting

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
