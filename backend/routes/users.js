import express from 'express';
import { getDatabase } from '../db/connection.js';
import { users } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { createLogger } from '../utils/logger.js';
import * as UserModel from '../models/User.js';

const router = express.Router();
const logger = createLogger('UsersRoute');

/**
 * GET /api/users
 * List all users (admin only)
 */
router.get('/', async (req, res) => {
  try {
    // Check if current user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    const db = getDatabase();
    const allUsers = await db
      .select({
        id: users.id,
        googleId: users.googleId,
        email: users.email,
        name: users.name,
        picture: users.picture,
        role: users.role,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    logger.info('Users retrieved', { count: allUsers.length, adminId: req.user.id });
    res.json(allUsers);
  } catch (error) {
    logger.error('Error fetching users', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

/**
 * PATCH /api/users/:id/role
 * Update user role (admin only)
 */
router.patch('/:id/role', async (req, res) => {
  try {
    // Check if current user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    const userId = parseInt(req.params.id, 10);
    const { role } = req.body;

    // Validate role
    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be "admin" or "user"' });
    }

    // Prevent self-demotion (admin cannot remove their own admin role)
    if (userId === req.user.id && role !== 'admin') {
      return res.status(400).json({ message: 'Cannot remove your own admin privileges' });
    }

    const updatedUser = await UserModel.updateUserRole(userId, role);

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    logger.info('User role updated', { 
      userId, 
      newRole: role, 
      updatedBy: req.user.id 
    });

    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      updatedAt: updatedUser.updatedAt,
    });
  } catch (error) {
    logger.error('Error updating user role', error);
    res.status(500).json({ message: 'Failed to update user role' });
  }
});

/**
 * GET /api/users/stats
 * Get user statistics (admin only)
 */
router.get('/stats', async (req, res) => {
  try {
    // Check if current user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    const db = getDatabase();
    const allUsers = await db.select().from(users);

    const stats = {
      totalUsers: allUsers.length,
      adminUsers: allUsers.filter(u => u.role === 'admin').length,
      regularUsers: allUsers.filter(u => u.role === 'user').length,
    };

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching user stats', error);
    res.status(500).json({ message: 'Failed to fetch user statistics' });
  }
});

export default router;
