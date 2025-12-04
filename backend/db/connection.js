const mongoose = require('mongoose');
const { attachDatabasePool } = require('@vercel/functions');

// MongoDB connection options optimized for serverless
const mongooseOptions = {
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

// Cache the connection promise for reuse across invocations
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Mask sensitive parts of the connection URI for logging
 * @param {string} uri MongoDB connection URI
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
 * Connect to MongoDB with caching for serverless environments.
 * Uses @vercel/functions attachDatabasePool for proper cleanup on function suspension.
 * @returns {Promise<mongoose.Connection>} Mongoose connection
 */
async function connectToDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/orderapp';
  const isUriFromEnv = !!process.env.MONGODB_URI;

  // Debug logging for connection diagnostics
  console.log('[MongoDB] Connection attempt starting...');
  console.log('[MongoDB] Environment:', process.env.NODE_ENV || 'not set');
  console.log('[MongoDB] MONGODB_URI from env:', isUriFromEnv ? 'yes' : 'no (using default)');
  console.log('[MongoDB] Connection URI (masked):', maskUri(uri));
  console.log('[MongoDB] Connection options:', JSON.stringify(mongooseOptions));

  if (cached.conn) {
    console.log('[MongoDB] Returning cached connection');
    return cached.conn;
  }

  if (!cached.promise) {
    console.log('[MongoDB] Creating new connection...');
    const startTime = Date.now();

    cached.promise = mongoose.connect(uri, mongooseOptions).then((mongoose) => {
      const duration = Date.now() - startTime;
      console.log(`[MongoDB] Connection established in ${duration}ms`);

      // Attach the mongoose connection for proper cleanup on Vercel
      // The underlying connection is exposed via mongoose.connection.getClient()
      try {
        const client = mongoose.connection.getClient();
        attachDatabasePool(client);
        console.log('[MongoDB] Database pool attached for Vercel cleanup');
      } catch (error) {
        // attachDatabasePool may not be available in non-Vercel environments
        // This is expected behavior in local development
        console.warn('[MongoDB] Could not attach database pool:', error.message);
      }
      return mongoose;
    }).catch((error) => {
      const duration = Date.now() - startTime;
      console.error(`[MongoDB] Connection failed after ${duration}ms`);
      console.error('[MongoDB] Error name:', error.name);
      console.error('[MongoDB] Error message:', error.message);
      console.error('[MongoDB] Error code:', error.code);
      if (error.reason) {
        console.error('[MongoDB] Error reason:', JSON.stringify(error.reason, null, 2));
      }
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

module.exports = { connectToDatabase };
