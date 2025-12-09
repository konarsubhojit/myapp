# Moving Customer Feedback App to Separate Repository

## Quick Start Guide

The customer feedback app is currently in the `customer-feedback-app/` directory. Follow these steps to move it to a separate repository:

### Step 1: Create New Repository on GitHub

1. Go to https://github.com/new
2. Repository name: `customer-feedback-app` (or your preferred name)
3. Description: "Customer-facing feedback collection for Order Management System"
4. Public or Private (your choice)
5. Don't initialize with README (we already have one)
6. Click "Create repository"

### Step 2: Move to Separate Repository

```bash
# From the Order Management repo root
cd customer-feedback-app

# Initialize git (if not already)
git init

# Add all files
git add .

# First commit
git commit -m "Initial commit: Customer feedback app"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/customer-feedback-app.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Deploy to Vercel (Recommended)

1. Go to https://vercel.com
2. Click "New Project"
3. Import your new repository
4. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Environment Variable**: 
     - Name: `VITE_API_URL`
     - Value: `https://your-backend-api.vercel.app/api`
5. Click "Deploy"

### Step 4: Update Order Management System

After deploying the customer feedback app, update the Order Management System:

```bash
# In Order Management repo
cd frontend

# Edit .env file
echo "VITE_FEEDBACK_APP_URL=https://your-feedback-app.vercel.app" >> .env
```

For production:
```env
VITE_FEEDBACK_APP_URL=https://your-feedback-app.vercel.app
```

### Step 5: Test the Integration

1. Start Order Management System
2. Create a completed order
3. Click "Get Feedback Link"
4. Open the link in a new tab
5. Submit feedback
6. Verify feedback appears in Order Management System

### Alternative: Deploy to Netlify

```bash
# In the customer-feedback-app directory
npm run build

# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod

# Follow prompts:
# - Publish directory: dist
# - Set environment variable: VITE_API_URL
```

### Alternative: Docker Deployment

```bash
# In customer-feedback-app directory
docker build -t customer-feedback-app .
docker run -p 3001:3001 \
  -e VITE_API_URL=https://your-backend-api.com/api \
  customer-feedback-app
```

### Optional: Clean Up Order Management Repo

After successfully moving to separate repo, you can optionally remove the directory from the main repo:

```bash
# In Order Management repo root
git rm -r customer-feedback-app/
git commit -m "Remove customer feedback app (moved to separate repo)"
git push
```

Update `.gitignore` to prevent accidental re-addition:
```bash
echo "customer-feedback-app/" >> .gitignore
```

## Environment Variables Summary

### Customer Feedback App
```env
VITE_API_URL=https://your-backend-api.com/api
```

### Order Management System
```env
VITE_API_URL=https://your-backend-api.com/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_FEEDBACK_APP_URL=https://your-feedback-app.com
```

### Backend (No Changes Needed)
```env
NEON_DATABASE_URL=your_database_url
PORT=5000
GOOGLE_CLIENT_ID=your_google_client_id
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

## Troubleshooting

### CORS Issues
If you get CORS errors, ensure your backend allows the feedback app domain:

```javascript
// In backend/server.js (if needed)
app.use(cors({
  origin: [
    'https://your-order-management.com',
    'https://your-feedback-app.com'
  ]
}));
```

### Link Not Working
1. Check `VITE_FEEDBACK_APP_URL` is set correctly
2. Verify feedback app is deployed and accessible
3. Check browser console for errors

### Database Connection
Both apps should use the same database. Ensure:
1. Backend is accessible from both apps
2. Public feedback endpoint is working: `/api/public/feedbacks`
3. Database credentials are correct

## Next Steps

After deployment:

1. **Test thoroughly**:
   - Generate feedback links
   - Submit feedback as customer
   - View feedback in dashboard

2. **Set up monitoring**:
   - Vercel/Netlify analytics
   - Backend API monitoring
   - Error tracking

3. **Configure domain** (optional):
   - Custom domain for feedback app
   - SSL certificate (auto with Vercel/Netlify)

4. **Send feedback links**:
   - Via email
   - Via SMS
   - Via WhatsApp
   - QR codes in packaging

## Resources

- Customer Feedback App README: See `customer-feedback-app/README.md`
- Setup Guide: See `FEEDBACK_SEPARATION_GUIDE.md`
- Vercel Docs: https://vercel.com/docs
- Netlify Docs: https://docs.netlify.com
