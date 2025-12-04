const { drizzle } = require('drizzle-orm/neon-http');
const { neon } = require('@neondatabase/serverless');
const { createLogger } = require('../utils/logger');

const logger = createLogger('PostgreSQL');

let cached = global.neonDb;

if (!cached) {
  cached = global.neonDb = { db: null };
}

/**
 * Get Drizzle database connection for Neon PostgreSQL.
 * Optimized for serverless environments like Vercel.
 * @returns {Object} Drizzle database instance
 */
function getDatabase() {
  const uri = process.env.NEON_DATABASE_URL;

  if (cached.db) {
    return cached.db;
  }

  if (!uri) {
    throw new Error('NEON_DATABASE_URL environment variable is not set');
  }

  logger.debug('Creating new database connection');
  const startTime = Date.now();

  try {
    const sql = neon(uri);
    cached.db = drizzle({ client: sql });
    const duration = Date.now() - startTime;
    logger.info('Database connection established', { durationMs: duration });
    return cached.db;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Database connection failed', { durationMs: duration, error: error.message });
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
