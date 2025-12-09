# Customer Feedback System - Separated Architecture Setup Guide

## Overview

The feedback system has been separated into two applications:

1. **Order Management System** (this repository) - Internal tool for managers
2. **Customer Feedback App** (`customer-feedback-app/`) - Public-facing feedback collection

## Architecture

```
┌──────────────────────────────┐
│  Order Management System     │
│  (Internal - Authenticated)  │
│  - View all feedback         │
│  - Generate feedback links   │
│  - Analytics dashboard       │
└────────────┬─────────────────┘
             │
             │ Generates links
             ↓
┌──────────────────────────────┐
│  Customer Feedback App       │
│  (Public - No Auth)          │
│  - Submit feedback           │
│  - URL: ?orderId=123         │
└────────────┬─────────────────┘
             │
             ↓
┌──────────────────────────────┐
│  Backend API (Shared)        │
│  - /api/feedbacks (auth)     │
│  - /api/public/feedbacks     │
└────────────┬─────────────────┘
             │
             ↓
┌──────────────────────────────┐
│  PostgreSQL Database         │
│  (Shared)                    │
└──────────────────────────────┘
```

## What Changed

### Order Management System
- **Removed**: FeedbackDialog component (customer submission form)
- **Changed**: "Give Feedback" button → "Get Feedback Link" button
- **Added**: Feedback link generation with clipboard copy
- **Kept**: FeedbackPanel for viewing all feedback
- **Kept**: All backend API endpoints with authentication

### New Customer Feedback App
- **Created**: Standalone React app in `customer-feedback-app/`
- **Purpose**: Public-facing feedback collection
- **Features**:
  - Single-page feedback form
  - URL parameter-based (/?orderId=123)
  - No authentication required
  - Mobile-responsive

### Backend API
- **Added**: `/api/public/feedbacks` - Public POST endpoint (no auth)
- **Kept**: `/api/feedbacks/*` - Authenticated endpoints for managers

## Setup Instructions

### 1. Order Management System Setup

No changes needed to existing setup. Just add the feedback app URL to environment:

```bash
cd frontend
echo "VITE_FEEDBACK_APP_URL=http://localhost:3001" >> .env
```

For production:
```
VITE_FEEDBACK_APP_URL=https://your-feedback-app.com
```

### 2. Customer Feedback App Setup

#### Local Development

```bash
cd customer-feedback-app

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env to point to your backend
# VITE_API_URL=http://localhost:5000/api

# Start development server
npm run dev
```

The app will run on `http://localhost:3001`

#### Production Deployment

**Option 1: Vercel (Recommended)**

1. Create a new GitHub repository for the customer feedback app:
   ```bash
   cd customer-feedback-app
   git init
   git add .
   git commit -m "Initial commit: Customer feedback app"
   git remote add origin <your-new-repo-url>
   git push -u origin main
   ```

2. Connect to Vercel:
   - Go to https://vercel.com
   - Import the new repository
   - Set environment variable: `VITE_API_URL=https://your-backend-api.com/api`
   - Deploy

**Option 2: Netlify**

1. Create new repository (same as above)
2. Connect to Netlify
3. Settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Environment variable: `VITE_API_URL=https://your-backend-api.com/api`
4. Deploy

**Option 3: Docker**

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

Build and run:
```bash
docker build -t customer-feedback-app .
docker run -p 3001:3001 -e VITE_API_URL=https://your-api.com/api customer-feedback-app
```

### 3. Backend Setup

The backend now has two feedback endpoints:

**Public Endpoint (No Auth)**
- `POST /api/public/feedbacks` - For customers to submit feedback

**Authenticated Endpoints** (For Managers)
- `GET /api/feedbacks` - List all feedback
- `GET /api/feedbacks/stats` - Get statistics
- `GET /api/feedbacks/:id` - Get specific feedback
- `GET /api/feedbacks/order/:orderId` - Get feedback by order
- `PUT /api/feedbacks/:id` - Update feedback or add manager response

No backend changes needed beyond what's in this PR.

## Usage Workflow

### Manager Workflow (Order Management System)

1. Complete an order
2. Open order details
3. Click "Get Feedback Link" button
4. Link is copied to clipboard
5. Send link to customer via email/SMS/WhatsApp
6. Customer submits feedback
7. View feedback in Feedback tab

### Customer Workflow

1. Receive feedback link: `https://feedback.yourcompany.com/?orderId=123`
2. Click link
3. See order information
4. Fill feedback form (ratings + comment)
5. Submit
6. See confirmation message

## Testing

### Test Customer Feedback App Locally

1. Start backend:
   ```bash
   cd backend
   npm start
   ```

2. Start Order Management System:
   ```bash
   cd frontend
   npm run dev
   ```

3. Start Customer Feedback App:
   ```bash
   cd customer-feedback-app
   npm run dev
   ```

4. Create a completed order in Order Management System

5. Get feedback link from order details

6. Open link in new browser tab

7. Submit feedback

8. View feedback in Order Management System > Feedback tab

## Environment Variables Summary

### Order Management System (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_FEEDBACK_APP_URL=http://localhost:3001
```

### Customer Feedback App (`customer-feedback-app/.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

### Backend (`backend/.env`)
```env
NEON_DATABASE_URL=your_database_url
PORT=5000
GOOGLE_CLIENT_ID=your_google_client_id
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
AUTH_DISABLED=false
```

## Security Considerations

### Public Feedback Endpoint
- Rate limiting is applied (100 requests per 15 minutes)
- Order ID validation prevents abuse
- Only completed orders can receive feedback
- Duplicate feedback prevention
- Input validation (rating bounds, text length)
- No sensitive order data exposed

### Recommendations
- Use HTTPS in production
- Consider adding CAPTCHA for public endpoint
- Monitor for abuse patterns
- Set up alerts for unusual activity

## Monitoring & Analytics

### What to Track
1. Feedback submission rate
2. Average ratings trends
3. Failed submission attempts
4. Response times
5. Link generation frequency

### Logging
Both apps log important events:
- Order Management: Link generation
- Customer App: Feedback submissions
- Backend: All feedback operations

## Troubleshooting

### Issue: Feedback link not working
**Solution**: Ensure `VITE_FEEDBACK_APP_URL` is set correctly in Order Management System

### Issue: "Order not found" error
**Solution**: Verify order ID is correct and order exists in database

### Issue: "Feedback already submitted"
**Solution**: Each order can only have one feedback. This is expected behavior.

### Issue: CORS errors
**Solution**: Ensure backend has CORS enabled for customer feedback app domain

### Issue: Can't submit feedback
**Solution**: Check that order status is "completed"

## Migration from Old System

If upgrading from the integrated feedback system:

1. No database changes needed (same schema)
2. Existing feedback data remains intact
3. Old FeedbackDialog component removed
4. New flow: Generate link → Send to customer
5. Customers use separate app instead of internal form

## Support

For issues or questions:
1. Check logs in respective applications
2. Verify environment variables
3. Ensure backend API is accessible from customer app
4. Check network tab for API errors

## Future Enhancements

Potential improvements:
1. **Email Integration**: Auto-send feedback links
2. **SMS Integration**: Send links via SMS
3. **QR Codes**: Generate QR codes for feedback links
4. **Multi-language**: Support multiple languages
5. **Custom Branding**: White-label the feedback app
6. **Analytics Dashboard**: Advanced feedback analytics
7. **Auto-reminders**: Remind customers to provide feedback

## Files Modified/Created

### Modified Files
- `frontend/src/components/OrderDetails.jsx` - Changed to generate links
- `frontend/.env.example` - Added VITE_FEEDBACK_APP_URL
- `backend/server.js` - Added public feedback route
- `backend/routes/publicFeedbacks.js` - New public endpoint

### New Directory
- `customer-feedback-app/` - Complete standalone React app
  - Package configuration
  - React components
  - API service
  - README and documentation

### Removed/Deprecated
- FeedbackDialog usage in OrderDetails (component file can be kept for reference)
