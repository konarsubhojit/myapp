# Quick Start Guide - Next.js Order Management System

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js v18 or higher
- Running backend server (see `/backend` folder)
- Google OAuth credentials

### Step 1: Install Dependencies

```bash
cd next
npm install
```

### Step 2: Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your credentials
nano .env  # or use your favorite editor
```

Required environment variables:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
```

To generate `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### Step 3: Start the Backend

In a separate terminal:
```bash
cd ../backend
npm start
# Backend runs on http://localhost:5000
```

### Step 4: Run the Next.js App

```bash
npm run dev
```

Your app will be available at **http://localhost:3000**

### Step 5: Sign In

1. Open http://localhost:3000
2. You'll be redirected to the login page
3. Click "Sign in with Google"
4. After successful authentication, you'll be redirected to the dashboard

## 📝 What You'll See

### Current Pages

1. **Home** (`/`) - Redirects to dashboard
2. **Login** (`/login`) - Google OAuth login page
3. **Dashboard** (`/dashboard`) - Protected dashboard (requires authentication)

### Available Features (Foundation)

✅ Google OAuth authentication  
✅ Session management  
✅ Material-UI components  
✅ Type-safe API client  
✅ Responsive design  

### Coming Soon (To Be Migrated)

- Order creation and management
- Item inventory management
- Sales analytics
- Customer feedback
- Priority notifications

## 🛠️ Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Run from root directory
cd ..
npm run next
```

## 🔧 Troubleshooting

### "Module not found" errors
```bash
# Clear Next.js cache and reinstall
rm -rf .next node_modules
npm install
```

### Google OAuth "redirect_uri_mismatch" Error

This is the most common authentication issue. Follow these steps:

**1. Verify Environment Variables**
```bash
# Make sure .env file exists
cp .env.example .env

# Edit .env and ensure these are set correctly:
# NEXTAUTH_URL=http://localhost:3000 (for local dev)
# GOOGLE_CLIENT_ID=your-client-id
# GOOGLE_CLIENT_SECRET=your-client-secret
```

**2. Configure Google Cloud Console**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: APIs & Services → Credentials
3. Select your OAuth 2.0 Client ID
4. Under "Authorized redirect URIs", add:
   - For local development: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://yourdomain.com/api/auth/callback/google`
5. Click "Save"

**3. Important Notes**
- The redirect URI must match **exactly** (including protocol, port, and path)
- Changes in Google Cloud Console may take a few minutes to propagate
- `NEXTAUTH_URL` must match your application's actual URL
- For production, always use `https://`

**4. Verify Configuration**
```bash
# Check that NEXTAUTH_URL is set
echo $NEXTAUTH_URL  # Should output: http://localhost:3000

# Restart the dev server after changing .env
npm run dev
```

### url.parse() Deprecation Warning

If you see this warning:
```
DeprecationWarning: `url.parse()` behavior is not standardized...
```

This is a known issue in next-auth@4.24.13 dependencies and does **not** affect functionality. It will be resolved in future versions of NextAuth. You can safely ignore this warning.

### Other NextAuth configuration issues
- Ensure `NEXTAUTH_URL` matches your app URL exactly
- Verify `NEXTAUTH_SECRET` is set (generate with `openssl rand -base64 32`)
- Never commit `.env` file to version control
- Use environment variables in production (Vercel, etc.)

### Build errors
```bash
# Check TypeScript errors
npm run build

# Check ESLint
npm run lint
```

### Backend connection issues
- Verify backend is running on http://localhost:5000
- Check `NEXT_PUBLIC_API_URL` in .env
- Test backend health: `curl http://localhost:5000/api/health`

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Guide](https://next-auth.js.org/getting-started/introduction)
- [Material-UI Docs](https://mui.com/)
- [Project README](./README.md)
- [Migration Guide](./MIGRATION.md)
- [Project Summary](./PROJECT_SUMMARY.md)

## 🎯 Next Steps After Setup

1. **Explore the Code**
   - Check `app/` for pages
   - Review `lib/api/client.ts` for API functions
   - Look at `types/` for data models

2. **Configure Google OAuth**
   - Add authorized redirect URI: http://localhost:3000/api/auth/callback/google
   - Get your credentials from Google Cloud Console

3. **Start Backend**
   - Follow instructions in `/backend/README.md`
   - Ensure PostgreSQL database is configured

4. **Begin Development**
   - Refer to MIGRATION.md for component migration
   - Start with simple components
   - Use the type-safe API client

## 📞 Need Help?

- Check [MIGRATION.md](./MIGRATION.md) for detailed migration guide
- Review [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) for project overview
- See existing React components in `/frontend/src/components` for reference

---

Happy coding! 🎉
