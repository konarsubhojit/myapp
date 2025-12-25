#!/usr/bin/env node

/**
 * Setup Script: Create Initial Admin User
 * 
 * This script creates an admin user in the database.
 * Run this after the database migration to set up your first admin user.
 * 
 * Usage:
 *   node scripts/createAdminUser.js <google-id> <email> <name> [picture-url]
 * 
 * Example:
 *   node scripts/createAdminUser.js "123456789" "admin@example.com" "Admin User"
 */

import 'dotenv/config';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

async function createAdminUser(googleId, email, name, picture = null) {
  try {
    console.log('Connecting to database...');
    
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.googleId, googleId))
      .limit(1);
    
    if (existingUser.length > 0) {
      console.log(`User with Google ID ${googleId} already exists.`);
      
      // Update to admin if not already
      if (existingUser[0].role !== 'admin') {
        await db
          .update(users)
          .set({ role: 'admin', updatedAt: new Date() })
          .where(eq(users.id, existingUser[0].id));
        console.log(`Updated user ${email} to admin role.`);
      } else {
        console.log(`User ${email} is already an admin.`);
      }
      
      return existingUser[0];
    }
    
    // Create new admin user
    const result = await db
      .insert(users)
      .values({
        googleId,
        email,
        name,
        picture,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    console.log('Admin user created successfully:');
    console.log(JSON.stringify(result[0], null, 2));
    
    return result[0];
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.error('Usage: node scripts/createAdminUser.js <google-id> <email> <name> [picture-url]');
  console.error('');
  console.error('To find your Google ID:');
  console.error('1. Sign in to the app with Google OAuth');
  console.error('2. The Google ID (sub claim) will be in the JWT token payload');
  console.error('3. You can decode the token at https://jwt.io to see the sub field');
  console.error('');
  console.error('Or you can create a user with a placeholder Google ID and update it later:');
  console.error('  node scripts/createAdminUser.js "PLACEHOLDER-123" "admin@example.com" "Admin User"');
  process.exit(1);
}

const [googleId, email, name, picture] = args;

createAdminUser(googleId, email, name, picture)
  .then(() => {
    console.log('\n✅ Admin user setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed to create admin user:', error.message);
    process.exit(1);
  });
