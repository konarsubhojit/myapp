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
 * Connect to MongoDB with caching for serverless environments.
 * Uses @vercel/functions attachDatabasePool for proper cleanup on function suspension.
 * @returns {Promise<mongoose.Connection>} Mongoose connection
 */
async function connectToDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/orderapp';

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, mongooseOptions).then((mongoose) => {
      // Attach the mongoose connection for proper cleanup on Vercel
      // The underlying connection is exposed via mongoose.connection.getClient()
      try {
        const client = mongoose.connection.getClient();
        attachDatabasePool(client);
      } catch (error) {
        // attachDatabasePool may not be available in non-Vercel environments
        // This is expected behavior in local development
        if (process.env.NODE_ENV !== 'development') {
          console.warn('Could not attach database pool:', error.message);
        }
      }
      return mongoose;
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
