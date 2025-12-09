# Customer Feedback App

A lightweight, customer-facing feedback collection application for the Order Management System.

## Overview

This standalone React application allows customers to submit feedback for their completed orders. It's designed to be deployed separately from the main Order Management System while sharing the same backend API and database.

## Features

- Single-page feedback submission form
- Multi-dimensional ratings (overall, product quality, delivery, service)
- Comment field with character limit
- Public/private feedback option
- URL parameter-based order identification
- No authentication required
- Mobile-responsive design

## Architecture

```
┌─────────────────────────┐
│  Customer Feedback App  │
│   (Port 3001)           │
│   - Public-facing       │
│   - No auth required    │
└───────────┬─────────────┘
            │ HTTP/HTTPS
            ↓
┌─────────────────────────┐
│   Backend API           │
│   (Port 5000)           │
│   - Shared with OMS     │
│   - POST /api/feedbacks │
└───────────┬─────────────┘
            │
            ↓
┌─────────────────────────┐
│   PostgreSQL Database   │
│   - Shared with OMS     │
│   - feedbacks table     │
└─────────────────────────┘
```

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env to point to your backend API
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   App will be available at `http://localhost:3001`

4. **Build for Production**
   ```bash
   npm run build
   ```

## Usage

### Generating Feedback Links

From the Order Management System, generate feedback links in this format:

```
https://your-feedback-app.com/?orderId={ORDER_ID}
```

Example:
```
https://feedback.example.com/?orderId=123
```

### Customer Flow

1. Customer receives feedback link via email/SMS
2. Clicks link and lands on feedback form
3. Sees order information
4. Submits feedback (ratings + comment)
5. Receives confirmation message

## Deployment

### Option 1: Vercel (Recommended)

1. Push this directory to a new GitHub repository
2. Connect to Vercel
3. Set environment variable: `VITE_API_URL`
4. Deploy

### Option 2: Netlify

1. Push to GitHub repository
2. Connect to Netlify
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Set environment variable: `VITE_API_URL`

### Option 3: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm install -g serve
EXPOSE 3001
CMD ["serve", "-s", "dist", "-l", "3001"]
```

## Integration with Order Management System

The Order Management System should:

1. Generate feedback links when orders are completed
2. Send links to customers via email/SMS
3. Store feedback via shared database
4. View feedback in FeedbackPanel dashboard

## API Endpoints Used

- `POST /api/feedbacks` - Submit feedback
- `GET /api/orders/:id` - Get order details (for validation)

## Security Considerations

- No authentication required (by design)
- Rate limiting should be configured on backend
- Order ID validation prevents abuse
- Only completed orders can receive feedback
- Duplicate feedback prevention

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| VITE_API_URL | Backend API URL | http://localhost:5000/api |

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

## License

Same as Order Management System
