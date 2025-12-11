import jwt, { JwtHeader, JwtPayload, VerifyOptions } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import type { Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger.js';
import { HTTP_STATUS } from '../constants/httpConstants.js';
import { GOOGLE_ISSUERS, JWKS_CONFIG } from '../constants/authConstants.js';
import type { AuthenticatedRequest, AuthUser, DecodedJwt } from '../types/index.js';

const logger = createLogger('AuthMiddleware');

/**
 * Check if issuer matches Google issuers
 */
function isGoogleIssuer(issuer: string): boolean {
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
 */
async function getSigningKey(header: JwtHeader): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!header.kid) {
      reject(new Error('No kid in token header'));
      return;
    }
    googleJwksClient.getSigningKey(header.kid, (err, key) => {
      if (err) {
        reject(err);
        return;
      }
      if (!key) {
        reject(new Error('No signing key found'));
        return;
      }
      const signingKey = key.getPublicKey();
      resolve(signingKey);
    });
  });
}

/**
 * Validate Google OAuth token
 */
async function validateGoogleToken(token: string): Promise<JwtPayload> {
  const decoded = jwt.decode(token, { complete: true }) as DecodedJwt | null;
  if (!decoded) {
    throw new Error('Invalid token format');
  }

  const signingKey = await getSigningKey(decoded.header as JwtHeader);
  
  return new Promise((resolve, reject) => {
    const options: VerifyOptions = {
      algorithms: ['RS256'],
      audience: process.env.GOOGLE_CLIENT_ID,
      issuer: [...GOOGLE_ISSUERS] as [string, ...string[]],
    };
    
    jwt.verify(
      token,
      signingKey,
      options,
      (err, payload) => {
        if (err) {
          reject(err);
        } else {
          resolve(payload as JwtPayload);
        }
      }
    );
  });
}

/**
 * Validate token and extract user info
 */
async function validateToken(token: string): Promise<AuthUser> {
  const decoded = jwt.decode(token, { complete: true }) as DecodedJwt | null;
  if (!decoded) {
    throw new Error('Invalid token format');
  }

  const issuer = (decoded.payload.iss as string) ?? '';

  if (isGoogleIssuer(issuer)) {
    const payload = await validateGoogleToken(token);
    return {
      id: payload.sub ?? '',
      email: payload.email as string ?? '',
      name: payload.name as string ?? '',
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
async function authMiddleware(
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void | Response> {
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
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== 'bearer') {
    logger.warn('Invalid Authorization header format');
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Authorization header must be Bearer token' });
  }

  const token = parts[1];

  if (!token) {
    logger.warn('Missing token in Authorization header');
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Token is required' });
  }

  try {
    const user = await validateToken(token);
    req.user = user;
    logger.debug('User authenticated', { userId: user.id, provider: user.provider });
    next();
  } catch (error) {
    logger.error('Token validation failed', error instanceof Error ? error : new Error(String(error)));
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Invalid or expired token' });
  }
}

/**
 * Optional authentication middleware
 * Validates token if present, but allows unauthenticated requests
 */
async function optionalAuthMiddleware(
  req: AuthenticatedRequest, 
  _res: Response, 
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== 'bearer') {
    return next();
  }

  const token = parts[1];

  if (!token) {
    return next();
  }

  try {
    const user = await validateToken(token);
    req.user = user;
  } catch (error) {
    // Silently ignore invalid tokens for optional auth
    logger.debug('Optional auth token validation failed', { error: error instanceof Error ? error.message : String(error) });
  }

  next();
}

export {
  authMiddleware,
  optionalAuthMiddleware,
  validateToken,
};
