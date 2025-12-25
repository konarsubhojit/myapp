import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { createLogger } from '../utils/logger.js';
import { HTTP_STATUS } from '../constants/httpConstants.js';
import { GOOGLE_ISSUERS, JWKS_CONFIG } from '../constants/authConstants.js';
import { findByGoogleId, isAdmin } from '../models/User.js';

const logger = createLogger('AuthMiddleware');

/**
 * Check if issuer matches Google issuers
 * @param {string} issuer - Token issuer
 * @returns {boolean} Whether issuer is a valid Google issuer
 */
function isGoogleIssuer(issuer) {
  return GOOGLE_ISSUERS.includes(issuer);
}

// JWKS client for Google
const googleJwksClient = jwksClient({
  jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
  cache: true,
  cacheMaxAge: JWKS_CONFIG.CACHE_MAX_AGE,
  rateLimit: true,
  jwksRequestsPerMinute: JWKS_CONFIG.RATE_LIMIT_PER_MINUTE,
});

/**
 * Get the signing key from Google's JWKS endpoint
 * @param {string} header - JWT header
 * @returns {Promise<string>} Signing key
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
 * Validate Google OAuth token
 * @param {string} token - JWT token
 * @returns {Promise<Object>} Decoded token payload
 */
async function validateGoogleToken(token) {
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
 * Validate token and extract user info from database
 * @param {string} token - JWT token
 * @returns {Promise<Object>} User info from database
 */
async function validateToken(token) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded) {
    throw new Error('Invalid token format');
  }

  const issuer = decoded.payload.iss || '';

  if (isGoogleIssuer(issuer)) {
    const payload = await validateGoogleToken(token);
    
    // Find user in database by Google ID
    const user = await findByGoogleId(payload.sub);
    if (!user) {
      throw new Error('User not found in database');
    }
    
    // Check if user has admin role
    const userIsAdmin = await isAdmin(user.id);
    if (!userIsAdmin) {
      const error = new Error('User does not have admin privileges');
      error.code = 'NOT_ADMIN';
      throw error;
    }
    
    return {
      id: user.id,
      googleId: user.googleId,
      email: user.email,
      name: user.name,
      picture: user.picture,
      role: user.role,
      provider: 'google',
    };
  } else {
    throw new Error('Unsupported token issuer');
  }
}

/**
 * Authentication middleware
 * Validates JWT token from Authorization header
 */
async function authMiddleware(req, res, next) {
  // Skip auth if explicitly disabled (for development only)
  // WARNING: This should never be enabled in production
  if (process.env.AUTH_DISABLED === 'true') {
    if (process.env.NODE_ENV === 'production') {
      logger.error('AUTH_DISABLED is set to true in production - this is a security risk!');
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Server configuration error' });
    }
    logger.warn('Authentication is disabled - dev mode active');
    req.user = { id: 'dev-user', email: 'dev@localhost', name: 'Dev User', provider: 'dev' };
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logger.warn('Missing Authorization header');
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Authorization header is required' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    logger.warn('Invalid Authorization header format');
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Authorization header must be Bearer token' });
  }

  const token = parts[1];

  try {
    const user = await validateToken(token);
    req.user = user;
    logger.debug('User authenticated', { userId: user.id, provider: user.provider });
    next();
  } catch (error) {
    logger.error('Token validation failed', error);
    
    // Handle non-admin users with 403 Forbidden
    if (error.code === 'NOT_ADMIN') {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ 
        message: 'Access denied. Admin privileges required.',
        code: 'NOT_ADMIN'
      });
    }
    
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
      message: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
}

/**
 * Optional authentication middleware
 * Validates token if present, but allows unauthenticated requests
 */
async function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return next();
  }

  const token = parts[1];

  try {
    const user = await validateToken(token);
    req.user = user;
  } catch (error) {
    // Silently ignore invalid tokens for optional auth
    logger.debug('Optional auth token validation failed', { error: error.message });
  }

  next();
}

export {
  authMiddleware,
  optionalAuthMiddleware,
  validateToken,
};
