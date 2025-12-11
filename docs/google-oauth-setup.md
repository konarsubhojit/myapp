# Google OAuth Setup Guide

This guide explains how to set up Google OAuth for the Order Management System to fix the "stuck at transform URL" login issue.

## Problem Description

Users were experiencing an issue where after selecting their Google account, the login page would get stuck at the "transform URL" of Google auth and not redirect back to the application.

## Root Cause

The issue was caused by using the default popup mode (`ux_mode="popup"`) in the `@react-oauth/google` library. Popup mode can fail in the following scenarios:

1. Third-party cookies are blocked in the browser
2. Popup blockers are enabled
3. Browser security settings prevent popup communication
4. Redirect URIs are not properly configured in Google Cloud Console

## Solution

The application now uses `ux_mode="redirect"` instead of popup mode, which is more reliable and works in all browser configurations.

## Setup Instructions

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter a project name (e.g., "Order Management System")
4. Click "Create"

### 2. Enable Google OAuth

1. In your project, navigate to "APIs & Services" → "Credentials"
2. Click "Configure Consent Screen"
3. Choose "External" user type (unless you have a Google Workspace account)
4. Fill in the required fields:
   - App name: "Order Management System"
   - User support email: Your email
   - Developer contact email: Your email
5. Click "Save and Continue" through the remaining steps

### 3. Create OAuth Client ID

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Web application" as the application type
4. Enter a name (e.g., "Order Management Web Client")

### 4. Configure Authorized JavaScript Origins

Add the following origins based on your deployment:

**Local Development:**
```
http://localhost:5173
```

**Production:**
```
https://your-app.vercel.app
```

> **Important:** Use the exact URL where your frontend is hosted (no trailing slash, no path)

### 5. Configure Authorized Redirect URIs

Add the following redirect URIs (same as the JavaScript origins):

**Local Development:**
```
http://localhost:5173
```

**Production:**
```
https://your-app.vercel.app
```

> **Critical:** The redirect URI must exactly match your application URL:
> - Protocol must match (http vs https)
> - Domain must match exactly (www vs non-www)
> - Port must match (if applicable)
> - No trailing slashes or paths

### 6. Copy Client ID

1. After creating the OAuth client, you'll see a "Client ID" and "Client secret"
2. Copy the **Client ID** (you don't need the client secret for this application)
3. Add it to your environment variables:

**Backend (.env):**
```env
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
```

**Frontend (.env):**
```env
VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
```

## Verification

After completing the setup:

1. Start your application:
   ```bash
   # Backend
   cd backend && npm start
   
   # Frontend (in a new terminal)
   cd frontend && npm run dev
   ```

2. Navigate to `http://localhost:5173`

3. Click "Sign in with Google"

4. You should be redirected to Google's login page

5. After selecting your Google account and granting permissions, you should be redirected back to the application and logged in

## Troubleshooting

### Still seeing "stuck at transform URL"?

1. **Verify Redirect URIs**: Make sure the redirect URI in Google Cloud Console exactly matches your application URL
   - Check for http vs https
   - Check for www vs non-www
   - Check the port number

2. **Clear Browser Cache**: Clear your browser cache and cookies for both your application and Google domains

3. **Try a Different Browser**: Test in an incognito/private window or a different browser

4. **Check Console Errors**: Open browser DevTools (F12) and check the Console tab for any error messages

### Common Issues

**Error: redirect_uri_mismatch**
- Solution: The redirect URI doesn't match. Make sure it's configured exactly as shown in the browser address bar

**Error: invalid_client**
- Solution: The Client ID is incorrect. Double-check you copied the entire Client ID string

**Error: access_denied**
- Solution: User denied permission or consent screen is not properly configured

**Popup blocked**
- Solution: This should no longer occur with redirect mode, but if you see this, the fix may not be applied

## How Redirect Mode Works

When using `ux_mode="redirect"`:

1. User clicks "Sign in with Google"
2. Browser redirects to Google's login page (not a popup)
3. User authenticates with Google
4. Google redirects back to your application URL with credentials
5. The `@react-oauth/google` library automatically captures the credentials from the URL
6. The `onSuccess` callback is triggered with the user's credentials
7. User is logged in to the application

This flow is more reliable than popup mode because:
- It works even with popup blockers
- It doesn't require third-party cookies
- It's the standard OAuth flow recommended by Google
- It works on all browsers and devices (including mobile)

## Security Notes

- Never commit your `.env` files to version control
- Keep your Client ID private (though it's not as sensitive as a client secret)
- Regularly review authorized users in Google Cloud Console
- Use HTTPS in production (required by Google for OAuth)
- Consider enabling additional security features in Google Cloud Console (e.g., restricting to specific domains)

## Additional Resources

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [@react-oauth/google Documentation](https://www.npmjs.com/package/@react-oauth/google)
- [Google Cloud Console](https://console.cloud.google.com/)
