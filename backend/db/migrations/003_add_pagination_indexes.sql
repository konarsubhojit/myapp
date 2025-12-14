-- ============================================================================
-- Order Management System - Performance Optimization Migration
-- ============================================================================
-- Migration: Add indexes for optimized pagination and order items lookup
-- Version: 1.0.1
-- Created: 2024-12-14
-- Description: Adds performance indexes to optimize orders pagination and
--              order items lookup for Vercel serverless deployment
-- ============================================================================

-- ============================================================================
-- INDEX ADDITIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Orders Table: Index for pagination ORDER BY created_at DESC
-- This index optimizes the common paginated query pattern:
--   SELECT * FROM orders ORDER BY created_at DESC LIMIT n OFFSET m
-- Without this index, Postgres must scan all rows to sort them
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at DESC);

COMMENT ON INDEX orders_created_at_idx IS 'Optimizes pagination by created_at (default order)';

-- ----------------------------------------------------------------------------
-- Order Items Table: Index for efficient lookup by order_id
-- This index optimizes batch fetching of order items:
--   SELECT * FROM order_items WHERE order_id IN (...)
-- Critical for avoiding N+1 queries when loading orders with items
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);

COMMENT ON INDEX order_items_order_id_idx IS 'Optimizes order items lookup for bulk fetching';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- 
-- Indexes added: 2
-- - orders_created_at_idx: Optimizes ORDER BY created_at DESC pagination
-- - order_items_order_id_idx: Optimizes IN () queries for batch item fetching
--
-- Performance impact:
-- - Orders pagination: O(log n) instead of O(n) for sorting
-- - Order items lookup: O(log n) instead of O(n) per lookup
-- ============================================================================
