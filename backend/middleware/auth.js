const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { createLogger } = require('../utils/logger');

const logger = createLogger('AuthMiddleware');

// JWKS client for Microsoft Entra ID (Azure AD)
const microsoftJwksClient = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'common'}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

// JWKS client for Google
const googleJwksClient = jwksClient({
  jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

/**
 * Get the signing key from the appropriate JWKS endpoint
 * @param {string} header - JWT header
 * @param {string} issuer - Token issuer
 * @returns {Promise<string>} Signing key
 */
async function getSigningKey(header, issuer) {
  return new Promise((resolve, reject) => {
    const client = issuer.includes('google') ? googleJwksClient : microsoftJwksClient;
    
    client.getSigningKey(header.kid, (err, key) => {
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
 * Validate Microsoft Entra ID token
 * @param {string} token - JWT token
 * @returns {Promise<Object>} Decoded token payload
 */
async function validateMicrosoftToken(token) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded) {
    throw new Error('Invalid token format');
  }

  const signingKey = await getSigningKey(decoded.header, 'microsoft');
  
  const validAudiences = [
    process.env.AZURE_CLIENT_ID,
    `api://${process.env.AZURE_CLIENT_ID}`,
  ].filter(Boolean);

  const tenantId = process.env.AZURE_TENANT_ID;
  // For multi-tenant apps (common), we still validate Microsoft issuers pattern
  // For single-tenant, we validate against the specific tenant
  let validIssuers;
  if (tenantId && tenantId !== 'common') {
    validIssuers = [
      `https://login.microsoftonline.com/${tenantId}/v2.0`,
      `https://sts.windows.net/${tenantId}/`,
    ];
  } else {
    // For multi-tenant apps, validate issuer format matches Microsoft pattern
    // The issuer must contain login.microsoftonline.com or sts.windows.net
    // This is enforced in the verify callback below
    logger.debug('Multi-tenant mode enabled - will validate issuer format');
  }

  return new Promise((resolve, reject) => {
    const options = {
      algorithms: ['RS256'],
      audience: validAudiences,
    };
    
    if (validIssuers) {
      options.issuer = validIssuers;
    }

    jwt.verify(token, signingKey, options, (err, payload) => {
      if (err) {
        reject(err);
      } else {
        // For multi-tenant apps, validate issuer format
        if (!validIssuers && payload.iss) {
          const iss = payload.iss;
          if (!iss.includes('login.microsoftonline.com') && !iss.includes('sts.windows.net')) {
            reject(new Error('Invalid issuer format for Microsoft token'));
            return;
          }
        }
        resolve(payload);
      }
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

  const signingKey = await getSigningKey(decoded.header, 'google');
  
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      signingKey,
      {
        algorithms: ['RS256'],
        audience: process.env.GOOGLE_CLIENT_ID,
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
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
 * Determine token issuer and validate accordingly
 * @param {string} token - JWT token
 * @returns {Promise<Object>} User info extracted from token
 */
async function validateToken(token) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded) {
    throw new Error('Invalid token format');
  }

  const issuer = decoded.payload.iss || '';
  let payload;

  if (issuer.includes('login.microsoftonline.com') || issuer.includes('sts.windows.net')) {
    payload = await validateMicrosoftToken(token);
    return {
      id: payload.oid || payload.sub,
      email: payload.preferred_username || payload.email,
      name: payload.name,
      provider: 'microsoft',
    };
  } else if (issuer.includes('accounts.google.com') || issuer === 'accounts.google.com') {
    payload = await validateGoogleToken(token);
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
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
      return res.status(500).json({ message: 'Server configuration error' });
    }
    logger.warn('Authentication is disabled - dev mode active');
    req.user = { id: 'dev-user', email: 'dev@localhost', name: 'Dev User', provider: 'dev' };
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logger.warn('Missing Authorization header');
    return res.status(401).json({ message: 'Authorization header is required' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    logger.warn('Invalid Authorization header format');
    return res.status(401).json({ message: 'Authorization header must be Bearer token' });
  }

  const token = parts[1];

  try {
    const user = await validateToken(token);
    req.user = user;
    logger.debug('User authenticated', { userId: user.id, provider: user.provider });
    next();
  } catch (error) {
    logger.error('Token validation failed', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
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

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  validateToken,
};
