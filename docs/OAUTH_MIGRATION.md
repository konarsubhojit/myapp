# Backend OAuth Migration Guide

## Overview

This migration moves Google OAuth authentication from the frontend to the backend and introduces role-based access control (RBAC) with admin-only access to the application.

## What Changed

### Backend Changes

1. **New Users Table**: A `users` table stores user information and roles
2. **Auth Routes**: New `/api/auth/google` endpoint handles OAuth token verification
3. **Admin Authorization**: Only users with `admin` role can access the application
4. **Updated Middleware**: Auth middleware now checks user role from database

### Frontend Changes

1. **Backend Token Exchange**: Login flow now exchanges Google token with backend
2. **403 Forbidden Page**: Non-admin users see a friendly access denied page
3. **Updated AuthContext**: Handles backend authentication and authorization

## Migration Steps

### 1. Run Database Migration

Apply the migration to create the users table:

```bash
cd backend
psql $NEON_DATABASE_URL -f db/migrations/0007_add_users_table.sql
```

### 2. Create Initial Admin User

You need to create at least one admin user to access the application:

**Option A: Create with placeholder Google ID (recommended for first-time setup)**

```bash
cd backend
node scripts/createAdminUser.js "PLACEHOLDER-123" "your-email@example.com" "Your Name"
```

After running this:
1. Sign in to the app with Google OAuth using your email
2. You'll see a 403 error (expected)
3. Decode your JWT token at https://jwt.io to find your Google ID (the `sub` field)
4. Update the user in the database:

```sql
UPDATE users 
SET google_id = 'YOUR-ACTUAL-GOOGLE-ID' 
WHERE email = 'your-email@example.com';
```

**Option B: Create with actual Google ID**

If you already know your Google ID:

```bash
cd backend
node scripts/createAdminUser.js "YOUR-GOOGLE-ID" "your-email@example.com" "Your Name"
```

### 3. Verify Setup

1. Start the backend server:
   ```bash
   cd backend
   npm start
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Sign in with Google OAuth
4. You should now have access to the application

### 4. Add More Admin Users

To add additional admin users, use the same script:

```bash
cd backend
node scripts/createAdminUser.js "GOOGLE-ID" "email@example.com" "User Name"
```

Or update existing users to admin role directly in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'user@example.com';
```

## Testing

### Test Admin Access

1. Sign in with an admin user
2. Verify full access to all features

### Test Non-Admin Access

1. Create a test user without admin role:
   ```sql
   INSERT INTO users (google_id, email, name, role)
   VALUES ('test-123', 'test@example.com', 'Test User', 'user');
   ```

2. Try to sign in with a Google account matching that email
3. You should see the 403 Forbidden page

## Troubleshooting

### "User not found in database" Error

- Ensure the user exists in the database
- Verify the Google ID matches exactly (case-sensitive)

### "Access denied. Admin privileges required" Error

- Check the user's role in the database:
  ```sql
  SELECT email, role FROM users WHERE email = 'your-email@example.com';
  ```
- Update to admin if needed:
  ```sql
  UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
  ```

### Token Verification Fails

- Ensure `GOOGLE_CLIENT_ID` is set correctly in backend `.env`
- Verify the token is being passed correctly from frontend
- Check backend logs for detailed error messages

## Rollback Plan

If you need to rollback this migration:

1. Revert to previous code version
2. Remove the users table:
   ```sql
   DROP TABLE IF EXISTS users;
   DROP TYPE IF EXISTS user_role;
   ```

## Security Notes

- **Never disable AUTH_DISABLED in production**: This bypasses all authentication
- **Keep admin list minimal**: Only grant admin role to trusted users
- **Monitor admin access**: Consider adding audit logging for admin actions
- **Rotate secrets regularly**: Update Google OAuth credentials periodically

## API Changes

### New Endpoints

- `POST /api/auth/google` - Exchange Google OAuth token
  - Request: `{ credential: string }`
  - Response: `{ token: string, user: { id, googleId, email, name, picture, role } }`
  - Returns 403 for non-admin users

### Modified Behavior

All authenticated endpoints now:
- Check user exists in database
- Verify user has admin role
- Return 403 if user is not admin

## Environment Variables

No new environment variables are required. Existing `GOOGLE_CLIENT_ID` is used for backend token verification.

## Future Enhancements

Potential improvements for the future:

1. **Fine-grained Permissions**: Add more granular role-based permissions
2. **User Management UI**: Admin interface to manage users and roles
3. **Audit Logging**: Track admin actions and changes
4. **Session Management**: Add refresh tokens and session expiration
5. **Multi-org Support**: Support multiple organizations with separate admin lists
