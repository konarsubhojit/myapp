import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('UserModel');

/**
 * User Model - Database operations for users table
 */

/**
 * Find user by Google ID
 * @param {string} googleId - Google unique identifier
 * @returns {Promise<Object|null>} User object or null if not found
 */
export async function findByGoogleId(googleId) {
  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.googleId, googleId))
      .limit(1);
    
    return result[0] || null;
  } catch (error) {
    logger.error('Error finding user by Google ID', error);
    throw error;
  }
}

/**
 * Find user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User object or null if not found
 */
export async function findByEmail(email) {
  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    return result[0] || null;
  } catch (error) {
    logger.error('Error finding user by email', error);
    throw error;
  }
}

/**
 * Create a new user
 * @param {Object} userData - User data
 * @param {string} userData.googleId - Google unique identifier
 * @param {string} userData.email - User email
 * @param {string} userData.name - User name
 * @param {string} [userData.picture] - User profile picture URL
 * @param {string} [userData.role='user'] - User role (admin or user)
 * @returns {Promise<Object>} Created user object
 */
export async function createUser(userData) {
  try {
    const result = await db
      .insert(users)
      .values({
        googleId: userData.googleId,
        email: userData.email,
        name: userData.name,
        picture: userData.picture || null,
        role: userData.role || 'user',
        lastLogin: new Date(),
      })
      .returning();
    
    logger.info('User created', { userId: result[0].id, email: userData.email });
    return result[0];
  } catch (error) {
    logger.error('Error creating user', error);
    throw error;
  }
}

/**
 * Update user's last login timestamp
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Updated user object
 */
export async function updateLastLogin(userId) {
  try {
    const result = await db
      .update(users)
      .set({
        lastLogin: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    return result[0];
  } catch (error) {
    logger.error('Error updating last login', error);
    throw error;
  }
}

/**
 * Find or create user from Google OAuth data
 * @param {Object} googleData - Google OAuth user data
 * @param {string} googleData.sub - Google unique identifier
 * @param {string} googleData.email - User email
 * @param {string} googleData.name - User name
 * @param {string} [googleData.picture] - User profile picture URL
 * @returns {Promise<Object>} User object
 */
export async function findOrCreateUser(googleData) {
  try {
    // Try to find existing user
    let user = await findByGoogleId(googleData.sub);
    
    if (user) {
      // Update last login
      await updateLastLogin(user.id);
      logger.info('User logged in', { userId: user.id, email: user.email });
      return user;
    }
    
    // Create new user
    user = await createUser({
      googleId: googleData.sub,
      email: googleData.email,
      name: googleData.name,
      picture: googleData.picture,
      role: 'user', // Default role is 'user'
    });
    
    return user;
  } catch (error) {
    logger.error('Error finding or creating user', error);
    throw error;
  }
}

/**
 * Check if user has admin role
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} True if user is admin
 */
export async function isAdmin(userId) {
  try {
    const result = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    return result[0]?.role === 'admin';
  } catch (error) {
    logger.error('Error checking admin status', error);
    throw error;
  }
}

/**
 * Update user role
 * @param {number} userId - User ID
 * @param {string} role - New role ('admin' or 'user')
 * @returns {Promise<Object>} Updated user object
 */
export async function updateUserRole(userId, role) {
  try {
    const result = await db
      .update(users)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    logger.info('User role updated', { userId, role });
    return result[0];
  } catch (error) {
    logger.error('Error updating user role', error);
    throw error;
  }
}
