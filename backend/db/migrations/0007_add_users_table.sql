-- Migration: Add users table with role-based access control
-- Created: 2025-12-25
-- Description: Adds users table to store Google OAuth user details and admin roles

-- Create user_role enum type
CREATE TYPE user_role AS ENUM ('admin', 'user');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  google_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  picture TEXT,
  role user_role NOT NULL DEFAULT 'user',
  last_login TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_google_id_idx ON users(google_id);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

-- Add comment to table
COMMENT ON TABLE users IS 'Stores user authentication and authorization information from Google OAuth';
COMMENT ON COLUMN users.google_id IS 'Google unique identifier (sub claim from JWT)';
COMMENT ON COLUMN users.role IS 'User role for authorization - admin users can access the application';
