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

/**
 * Run database migrations to create required tables.
 * @returns {Promise<void>}
 */
async function runMigrations() {
  const databaseUrl = process.env.NEON_DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('NEON_DATABASE_URL environment variable is not set');
  }

  console.log('[Migration] Starting database migration...');
  
  const sql = neon(databaseUrl);

  // Create enum type for order_from
  console.log('[Migration] Creating order_from enum type...');
  await sql`
    DO $$ BEGIN
      CREATE TYPE order_from AS ENUM ('instagram', 'facebook', 'whatsapp', 'call', 'offline');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `;

  // Create items table
  console.log('[Migration] Creating items table...');
  await sql`
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `;

  // Create orders table
  console.log('[Migration] Creating orders table...');
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

  // Create order_items table
  console.log('[Migration] Creating order_items table...');
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

  // Create indexes for better performance
  console.log('[Migration] Creating indexes...');
  await sql`
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
  `;

  console.log('[Migration] Migration completed successfully!');
}

// Export the function for use in server.js
module.exports = { runMigrations };

// Allow running as standalone script
if (require.main === module) {
  require('dotenv').config();
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('[Migration] Migration failed:', error);
      process.exit(1);
    });
}
