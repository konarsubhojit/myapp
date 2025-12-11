import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { createLogger } from '../utils/logger.js';
import * as schema from './schema.js';

const logger = createLogger('PostgreSQL');

let cached = global.neonDb;

if (!cached) {
  cached = global.neonDb = { db: null };
}

export function getDatabase() {
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
    cached.db = drizzle({ client: sql, schema });
    const duration = Date.now() - startTime;
    logger.info('Database connection established', { durationMs: duration });
    return cached.db;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Database connection failed', { durationMs: duration, error: error.message });
    throw error;
  }
}

export async function connectToDatabase() {
  return getDatabase();
}
