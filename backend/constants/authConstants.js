// Authentication Configuration Constants

// Google OAuth Issuers
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

// JWKS (JSON Web Key Set) Configuration
const JWKS_CONFIG = {
  CACHE_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  RATE_LIMIT_PER_MINUTE: 10
};

module.exports = {
  GOOGLE_ISSUERS,
  JWKS_CONFIG
};
