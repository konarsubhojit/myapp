/**
 * Database migration script for Neon PostgreSQL
 * Run this script to create the required tables in your database.
 * 
 * Usage: node db/migrate.js
 * 
 * Make sure NEON_DATABASE_URL is set in your environment before running.
 */

require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function migrate() {
  const databaseUrl = process.env.NEON_DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('NEON_DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('Starting database migration...');
  
  const sql = neon(databaseUrl);

  try {
    // Create enum type for order_from
    console.log('Creating order_from enum type...');
    await sql`
      DO $$ BEGIN
        CREATE TYPE order_from AS ENUM ('instagram', 'facebook', 'whatsapp', 'call', 'offline');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    // Create items table
    console.log('Creating items table...');
    await sql`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

    // Create orders table
    console.log('Creating orders table...');
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
    console.log('Creating order_items table...');
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
    console.log('Creating indexes...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    `;

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
