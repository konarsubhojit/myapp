const { drizzle } = require('drizzle-orm/neon-http');
const { neon } = require('@neondatabase/serverless');

// Cache the database connection for reuse across invocations
let cached = global.neonDb;

if (!cached) {
  cached = global.neonDb = { db: null };
}

/**
 * Mask sensitive parts of the connection URI for logging
 * @param {string} uri PostgreSQL connection URI
 * @returns {string} Masked URI safe for logging
 */
function maskUri(uri) {
  if (!uri) return 'undefined';
  try {
    // Replace password in the URI with asterisks
    return uri.replace(/:([^:@]+)@/, ':****@');
  } catch {
    return '[invalid URI format]';
  }
}

/**
 * Get Drizzle database connection for Neon PostgreSQL.
 * Optimized for serverless environments like Vercel.
 * @returns {Object} Drizzle database instance
 */
function getDatabase() {
  const uri = process.env.NEON_DATABASE_URL;
  const isUriFromEnv = !!process.env.NEON_DATABASE_URL;

  // Debug logging for connection diagnostics
  console.log('[PostgreSQL] Getting database connection...');
  console.log('[PostgreSQL] Environment:', process.env.NODE_ENV || 'not set');
  console.log('[PostgreSQL] NEON_DATABASE_URL from env:', isUriFromEnv ? 'yes' : 'no');
  console.log('[PostgreSQL] Connection URI (masked):', maskUri(uri));

  if (cached.db) {
    console.log('[PostgreSQL] Returning cached connection');
    return cached.db;
  }

  if (!uri) {
    throw new Error('NEON_DATABASE_URL environment variable is not set');
  }

  console.log('[PostgreSQL] Creating new connection...');
  const startTime = Date.now();

  try {
    const sql = neon(uri);
    cached.db = drizzle({ client: sql });
    const duration = Date.now() - startTime;
    console.log(`[PostgreSQL] Connection established in ${duration}ms`);
    return cached.db;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[PostgreSQL] Connection failed after ${duration}ms`);
    console.error('[PostgreSQL] Error name:', error.name);
    console.error('[PostgreSQL] Error message:', error.message);
    throw error;
  }
}

/**
 * Connect to the database (for backwards compatibility with server.js)
 * @returns {Promise<Object>} Database connection
 */
async function connectToDatabase() {
  return getDatabase();
}

module.exports = { connectToDatabase, getDatabase };
