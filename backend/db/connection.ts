import { drizzle } from 'drizzle-orm/neon-http';
import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { createLogger } from '../utils/logger.js';
import * as schema from './schema.js';

const logger = createLogger('PostgreSQL');

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

interface DbCache {
  db: DrizzleDb | null;
}

declare global {
  // eslint-disable-next-line no-var
  var neonDb: DbCache | undefined;
}

let cached: DbCache = global.neonDb ?? { db: null };

if (!global.neonDb) {
  global.neonDb = cached;
}

export function getDatabase(): DrizzleDb {
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
    const sql: NeonQueryFunction<false, false> = neon(uri);
    cached.db = drizzle({ client: sql, schema });
    const duration = Date.now() - startTime;
    logger.info('Database connection established', { durationMs: duration });
    return cached.db;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Database connection failed', { durationMs: duration, error: errorMessage });
    throw error;
  }
}

export async function connectToDatabase(): Promise<DrizzleDb> {
  return getDatabase();
}
