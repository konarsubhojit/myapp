import express from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { createLogger } from '../utils/logger.js';
import { HTTP_STATUS } from '../constants/httpConstants.js';
import { GOOGLE_ISSUERS } from '../constants/authConstants.js';
import { findOrCreateUser, isAdmin } from '../models/User.js';

const router = express.Router();
const logger = createLogger('AuthRoutes');

// JWKS client for Google
const googleJwksClient = jwksClient({
  jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

/**
 * Get the signing key from Google's JWKS endpoint
 */
async function getSigningKey(header) {
  return new Promise((resolve, reject) => {
    googleJwksClient.getSigningKey(header.kid, (err, key) => {
      if (err) {
        reject(err);
        return;
      }
      const signingKey = key.getPublicKey();
      resolve(signingKey);
    });
  });
}

/**
 * Verify Google OAuth token
 */
async function verifyGoogleToken(token) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded) {
    throw new Error('Invalid token format');
  }

  const signingKey = await getSigningKey(decoded.header);
  
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      signingKey,
      {
        algorithms: ['RS256'],
        audience: process.env.GOOGLE_CLIENT_ID,
        issuer: GOOGLE_ISSUERS,
      },
      (err, payload) => {
        if (err) {
          reject(err);
        } else {
          resolve(payload);
        }
      }
    );
  });
}

/**
 * POST /api/auth/google
 * Exchange Google OAuth token for user session
 * 
 * Request body:
 * {
 *   credential: string // Google OAuth JWT token
 * }
 * 
 * Response:
 * {
 *   token: string // Same Google JWT token (passed through for frontend use)
 *   user: {
 *     id: number
 *     googleId: string
 *     email: string
 *     name: string
 *     picture: string
 *     role: string
 *   }
 * }
 */
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Missing credential in request body'
      });
    }

    // Verify the Google token
    const payload = await verifyGoogleToken(credential);
    
    // Find or create user in database
    const user = await findOrCreateUser({
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    });

    // Check if user has admin role
    const userIsAdmin = await isAdmin(user.id);
    
    if (!userIsAdmin) {
      logger.warn('Non-admin user attempted to access', { 
        userId: user.id, 
        email: user.email 
      });
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: 'Access denied. Admin privileges required.',
        code: 'NOT_ADMIN'
      });
    }

    logger.info('User authenticated successfully', { 
      userId: user.id, 
      email: user.email,
      role: user.role
    });

    // Return the token and user data
    // Note: We return the original Google token for the frontend to use
    res.json({
      token: credential,
      user: {
        id: user.id,
        googleId: user.googleId,
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role,
      }
    });
  } catch (error) {
    logger.error('Google authentication failed', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information (requires authentication)
 */
router.get('/me', async (req, res) => {
  try {
    // req.user is set by authMiddleware
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Not authenticated'
      });
    }

    res.json({
      user: req.user
    });
  } catch (error) {
    logger.error('Error fetching current user', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to fetch user information'
    });
  }
});

export default router;
