-- ============================================================================
-- Order Management System - Cursor-Based Pagination Migration
-- ============================================================================
-- Migration: Add composite indexes for cursor-based (keyset) pagination
-- Version: 1.0.2
-- Created: 2025-12-15
-- Description: Adds composite partial indexes to support efficient cursor-based
--              pagination for items, replacing COUNT(*) + OFFSET approach
-- ============================================================================

-- ============================================================================
-- INDEX ADDITIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Items Table: Composite index for active items cursor pagination
-- This partial index optimizes keyset pagination for non-deleted items:
--   ORDER BY created_at DESC, id DESC WHERE deleted_at IS NULL
-- The composite index allows efficient "seek" operations using cursor values
-- like: WHERE (created_at, id) < (cursor_created_at, cursor_id)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS items_active_cursor_idx 
ON items(created_at DESC, id DESC) 
WHERE deleted_at IS NULL;

COMMENT ON INDEX items_active_cursor_idx IS 'Optimizes cursor-based pagination for active items (created_at DESC, id DESC)';

-- ----------------------------------------------------------------------------
-- Items Table: Composite index for deleted items cursor pagination
-- This partial index optimizes keyset pagination for deleted items:
--   ORDER BY deleted_at DESC, id DESC WHERE deleted_at IS NOT NULL
-- The composite index allows efficient "seek" operations using cursor values
-- like: WHERE (deleted_at, id) < (cursor_deleted_at, cursor_id)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS items_deleted_cursor_idx 
ON items(deleted_at DESC, id DESC) 
WHERE deleted_at IS NOT NULL;

COMMENT ON INDEX items_deleted_cursor_idx IS 'Optimizes cursor-based pagination for deleted items (deleted_at DESC, id DESC)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- 
-- Indexes added: 2
-- - items_active_cursor_idx: Partial index for active items cursor pagination
-- - items_deleted_cursor_idx: Partial index for deleted items cursor pagination
--
-- Performance benefits:
-- - Eliminates need for COUNT(*) queries (O(n) -> O(1))
-- - Eliminates OFFSET scans (O(offset) -> O(1))
-- - Consistent performance regardless of page depth
-- - Partial indexes reduce index size and maintenance overhead
-- - Composite indexes enable efficient keyset "seek" operations
--
-- Query pattern enabled:
-- SELECT * FROM items 
-- WHERE deleted_at IS NULL 
--   AND (created_at, id) < (cursor_created_at, cursor_id)
-- ORDER BY created_at DESC, id DESC 
-- LIMIT n+1
-- ============================================================================
