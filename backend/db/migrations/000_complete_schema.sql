-- ============================================================================
-- Order Management System - Complete Database Schema
-- ============================================================================
-- Migration: Complete schema with all tables, indexes, and optimizations
-- Version: 2.0.0
-- Created: 2024-12-19
-- Description: Idempotent migration script for full database schema including
--              all tables, enums, indexes, constraints, and optimizations.
--              This script can be run multiple times safely (idempotent).
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Order source enum: Tracks where the order came from
DO $$ BEGIN
    CREATE TYPE order_from AS ENUM (
        'instagram',
        'facebook',
        'whatsapp',
        'call',
        'offline'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Order status enum: Tracks the order processing status
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM (
        'pending',
        'processing',
        'completed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Items Table: Product catalog with soft delete support
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    color TEXT,
    fabric TEXT,
    special_features TEXT,
    image_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Performance indexes for items table
CREATE INDEX IF NOT EXISTS items_name_idx ON items(name);
CREATE INDEX IF NOT EXISTS items_deleted_at_idx ON items(deleted_at);

-- Add comments for documentation
COMMENT ON TABLE items IS 'Product catalog with soft delete support for recovery';
COMMENT ON COLUMN items.name IS 'Product name';
COMMENT ON COLUMN items.price IS 'Product price in the base currency';
COMMENT ON COLUMN items.color IS 'Product color variant (deprecated - use item_designs instead)';
COMMENT ON COLUMN items.fabric IS 'Fabric type/material';
COMMENT ON COLUMN items.special_features IS 'Special product features or customizations';
COMMENT ON COLUMN items.image_url IS 'URL to product image stored in Vercel Blob';
COMMENT ON COLUMN items.deleted_at IS 'Soft delete timestamp (NULL = active, NOT NULL = deleted)';

-- ----------------------------------------------------------------------------
-- Item Designs Table: Multiple design variants per item
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS item_designs (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    design_name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false NOT NULL,
    display_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS item_designs_item_id_idx ON item_designs(item_id);
CREATE INDEX IF NOT EXISTS item_designs_is_primary_idx ON item_designs(is_primary);

-- Add comments for documentation
COMMENT ON TABLE item_designs IS 'Multiple design variants for each item';
COMMENT ON COLUMN item_designs.item_id IS 'Reference to parent item';
COMMENT ON COLUMN item_designs.design_name IS 'Name/description of this design variant';
COMMENT ON COLUMN item_designs.image_url IS 'URL to design image stored in Vercel Blob';
COMMENT ON COLUMN item_designs.is_primary IS 'Whether this is the primary/default design for the item';
COMMENT ON COLUMN item_designs.display_order IS 'Order in which to display this design';

-- ----------------------------------------------------------------------------
-- Orders Table: Core order management with delivery tracking
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_id TEXT NOT NULL UNIQUE,
    order_from order_from NOT NULL,
    customer_name TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    address TEXT,
    total_price NUMERIC(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'unpaid',
    paid_amount NUMERIC(10, 2) DEFAULT 0,
    confirmation_status TEXT DEFAULT 'unconfirmed',
    customer_notes TEXT,
    priority INTEGER DEFAULT 0,
    order_date TIMESTAMP,
    expected_delivery_date TIMESTAMP,
    delivery_status TEXT DEFAULT 'not_shipped',
    tracking_id TEXT,
    delivery_partner TEXT,
    actual_delivery_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Performance indexes for orders table (optimized for common queries)
CREATE INDEX IF NOT EXISTS orders_order_id_idx ON orders(order_id);
CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON orders(customer_id);
CREATE INDEX IF NOT EXISTS orders_delivery_date_idx ON orders(expected_delivery_date);
CREATE INDEX IF NOT EXISTS orders_priority_idx ON orders(priority);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at);
CREATE INDEX IF NOT EXISTS orders_created_at_id_idx ON orders(created_at DESC, id DESC);

-- Add comments for documentation
COMMENT ON TABLE orders IS 'Core order management with delivery tracking and priority support';
COMMENT ON COLUMN orders.order_id IS 'Human-readable unique order identifier';
COMMENT ON COLUMN orders.order_from IS 'Source channel of the order (instagram, facebook, whatsapp, call, offline)';
COMMENT ON COLUMN orders.customer_name IS 'Customer full name';
COMMENT ON COLUMN orders.customer_id IS 'Customer identifier for grouping orders';
COMMENT ON COLUMN orders.address IS 'Delivery address';
COMMENT ON COLUMN orders.total_price IS 'Total order value';
COMMENT ON COLUMN orders.status IS 'Order processing status';
COMMENT ON COLUMN orders.payment_status IS 'Payment status (paid, unpaid, partial)';
COMMENT ON COLUMN orders.paid_amount IS 'Amount paid by customer';
COMMENT ON COLUMN orders.confirmation_status IS 'Order confirmation status';
COMMENT ON COLUMN orders.customer_notes IS 'Special instructions or notes from customer';
COMMENT ON COLUMN orders.priority IS 'Order priority level (higher = more urgent)';
COMMENT ON COLUMN orders.order_date IS 'Date when order was placed';
COMMENT ON COLUMN orders.expected_delivery_date IS 'Expected delivery date';
COMMENT ON COLUMN orders.delivery_status IS 'Status of delivery: not_shipped, shipped, in_transit, out_for_delivery, delivered, returned';
COMMENT ON COLUMN orders.tracking_id IS 'Tracking ID or AWB number from delivery partner';
COMMENT ON COLUMN orders.delivery_partner IS 'Name of delivery partner';
COMMENT ON COLUMN orders.actual_delivery_date IS 'Actual date when order was delivered';

-- ----------------------------------------------------------------------------
-- Order Items Table: Junction table for order-item relationships
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    design_id INTEGER REFERENCES item_designs(id),
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    customization_request TEXT,
    CONSTRAINT fk_order_items_order 
        FOREIGN KEY (order_id) 
        REFERENCES orders(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_order_items_item 
        FOREIGN KEY (item_id) 
        REFERENCES items(id)
);

-- Performance index for order items
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);

-- Add comments for documentation
COMMENT ON TABLE order_items IS 'Junction table linking orders to items with quantity and customization';
COMMENT ON COLUMN order_items.order_id IS 'Reference to parent order';
COMMENT ON COLUMN order_items.item_id IS 'Reference to catalog item';
COMMENT ON COLUMN order_items.design_id IS 'Reference to specific design variant (optional)';
COMMENT ON COLUMN order_items.name IS 'Snapshot of item name at time of order';
COMMENT ON COLUMN order_items.price IS 'Snapshot of item price at time of order';
COMMENT ON COLUMN order_items.quantity IS 'Quantity ordered';
COMMENT ON COLUMN order_items.customization_request IS 'Special customization requests for this item';

-- ----------------------------------------------------------------------------
-- Feedbacks Table: Customer feedback system with ratings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feedbacks (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    product_quality INTEGER CHECK (product_quality IS NULL OR (product_quality >= 1 AND product_quality <= 5)),
    delivery_experience INTEGER CHECK (delivery_experience IS NULL OR (delivery_experience >= 1 AND delivery_experience <= 5)),
    is_public INTEGER DEFAULT 1,
    response_text TEXT,
    responded_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_feedbacks_order 
        FOREIGN KEY (order_id) 
        REFERENCES orders(id) 
        ON DELETE CASCADE,
    CONSTRAINT unique_order_feedback 
        UNIQUE (order_id)
);

-- Performance indexes for feedbacks table (optimized for analytics)
CREATE INDEX IF NOT EXISTS idx_feedbacks_order_id ON feedbacks(order_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_rating ON feedbacks(rating);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_is_public ON feedbacks(is_public);

-- Add comments for documentation
COMMENT ON TABLE feedbacks IS 'Customer feedback on completed orders with multi-dimensional ratings';
COMMENT ON COLUMN feedbacks.order_id IS 'Reference to the order being reviewed';
COMMENT ON COLUMN feedbacks.rating IS 'Overall rating (1-5 stars, required)';
COMMENT ON COLUMN feedbacks.comment IS 'Customer feedback text';
COMMENT ON COLUMN feedbacks.product_quality IS 'Product quality rating (1-5 stars, optional)';
COMMENT ON COLUMN feedbacks.delivery_experience IS 'Delivery experience rating (1-5 stars, optional)';
COMMENT ON COLUMN feedbacks.is_public IS '1 = public (visible to customers), 0 = private';
COMMENT ON COLUMN feedbacks.response_text IS 'Manager response to customer feedback';
COMMENT ON COLUMN feedbacks.responded_at IS 'Timestamp when manager responded';

-- ----------------------------------------------------------------------------
-- Feedback Tokens Table: Secure token-based feedback access
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feedback_tokens (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    used INTEGER DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_feedback_tokens_order 
        FOREIGN KEY (order_id) 
        REFERENCES orders(id) 
        ON DELETE CASCADE
);

-- Performance indexes for feedback tokens table (optimized for validation)
CREATE INDEX IF NOT EXISTS idx_feedback_tokens_order_id ON feedback_tokens(order_id);
CREATE INDEX IF NOT EXISTS idx_feedback_tokens_token ON feedback_tokens(token);

-- Add comments for documentation
COMMENT ON TABLE feedback_tokens IS 'Secure tokens for feedback submission links with expiration';
COMMENT ON COLUMN feedback_tokens.order_id IS 'Reference to the order for which feedback is requested';
COMMENT ON COLUMN feedback_tokens.token IS 'Cryptographically secure random token (64 char hex)';
COMMENT ON COLUMN feedback_tokens.used IS '0 = unused, 1 = used (one-time use)';
COMMENT ON COLUMN feedback_tokens.expires_at IS 'Token expiration timestamp (default 30 days)';

-- ----------------------------------------------------------------------------
-- Notification Recipients Table: Stores email addresses for digest delivery
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_recipients (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE notification_recipients IS 'Email recipients for daily digest notifications';
COMMENT ON COLUMN notification_recipients.email IS 'Email address of the recipient';
COMMENT ON COLUMN notification_recipients.enabled IS 'Whether to include this recipient in digests';

-- ----------------------------------------------------------------------------
-- Order Reminder State Table: Tracks which reminder tiers have been sent
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_reminder_state (
    order_id INTEGER PRIMARY KEY,
    delivery_date_snapshot TIMESTAMP NOT NULL,
    sent_7d BOOLEAN NOT NULL DEFAULT false,
    sent_3d BOOLEAN NOT NULL DEFAULT false,
    sent_1d BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_order_reminder_state_order 
        FOREIGN KEY (order_id) 
        REFERENCES orders(id) 
        ON DELETE CASCADE
);

-- Add comments for documentation
COMMENT ON TABLE order_reminder_state IS 'Tracks reminder state per order to avoid duplicate notifications';
COMMENT ON COLUMN order_reminder_state.order_id IS 'Reference to the order';
COMMENT ON COLUMN order_reminder_state.delivery_date_snapshot IS 'Snapshot of expected delivery date when state was last updated';
COMMENT ON COLUMN order_reminder_state.sent_7d IS 'Whether 7-day reminder has been sent';
COMMENT ON COLUMN order_reminder_state.sent_3d IS 'Whether 3-day reminder has been sent';
COMMENT ON COLUMN order_reminder_state.sent_1d IS 'Whether 1-day reminder has been sent';

-- ----------------------------------------------------------------------------
-- Digest Runs Table: Tracks daily digest execution for idempotency
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS digest_runs (
    id SERIAL PRIMARY KEY,
    digest_date DATE NOT NULL UNIQUE,
    status TEXT NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMP,
    error TEXT
);

-- Add comments for documentation
COMMENT ON TABLE digest_runs IS 'Tracks daily digest executions for idempotency';
COMMENT ON COLUMN digest_runs.digest_date IS 'The Kolkata calendar date for this digest run';
COMMENT ON COLUMN digest_runs.status IS 'Status: started, sent, or failed';
COMMENT ON COLUMN digest_runs.sent_at IS 'Timestamp when email was successfully sent';
COMMENT ON COLUMN digest_runs.error IS 'Error message if digest failed';

-- ============================================================================
-- DATA MIGRATION
-- ============================================================================

-- Migrate existing item images to item_designs table (if not already done)
-- For items with imageUrl, create a default design entry marked as primary
INSERT INTO item_designs (item_id, design_name, image_url, is_primary, display_order)
SELECT 
  id,
  'Default Design',
  image_url,
  true,
  0
FROM items
WHERE image_url IS NOT NULL 
  AND image_url != ''
  AND NOT EXISTS (
    SELECT 1 FROM item_designs WHERE item_designs.item_id = items.id
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- 
-- This migration creates a complete database schema for the Order Management System
-- including all tables, indexes, and constraints with performance optimizations.
-- 
-- Tables created/updated:
-- - items (8 columns + soft delete)
-- - item_designs (7 columns + design variants)
-- - orders (19 columns + delivery tracking)
-- - order_items (7 columns + design reference)
-- - feedbacks (11 columns + ratings)
-- - feedback_tokens (5 columns + security)
-- - notification_recipients (4 columns)
-- - order_reminder_state (6 columns)
-- - digest_runs (5 columns)
--
-- Indexes created: 20+ total for optimal query performance
-- 
-- This script is idempotent and can be run multiple times safely.
-- ============================================================================
