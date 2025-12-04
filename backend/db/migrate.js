/**
 * Database migration script for Neon PostgreSQL
 * Run this script to create the required tables in your database.
 * 
 * Usage: node db/migrate.js (standalone)
 * Or import and call runMigrations() from server.js
 * 
 * Make sure NEON_DATABASE_URL is set in your environment before running.
 */

const { neon } = require('@neondatabase/serverless');
const { createLogger } = require('../utils/logger');

const logger = createLogger('Migration');

/**
 * Run database migrations to create required tables.
 * @returns {Promise<void>}
 */
async function runMigrations() {
  const databaseUrl = process.env.NEON_DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('NEON_DATABASE_URL environment variable is not set');
  }

  logger.info('Starting database migration');
  
  const sql = neon(databaseUrl);

  try {
    await sql`
      DO $$ BEGIN
        CREATE TYPE order_from AS ENUM ('instagram', 'facebook', 'whatsapp', 'call', 'offline');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_id TEXT NOT NULL UNIQUE,
        order_from order_from NOT NULL,
        customer_name TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        total_price NUMERIC(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        item_id INTEGER NOT NULL REFERENCES items(id),
        name TEXT NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        quantity INTEGER NOT NULL
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    `;

    logger.info('Migration completed successfully');
  } catch (error) {
    logger.error('Migration failed', error);
    throw error;
  }
}

module.exports = { runMigrations };

if (require.main === module) {
  require('dotenv').config();
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error('Migration failed', error);
      process.exit(1);
    });
}
