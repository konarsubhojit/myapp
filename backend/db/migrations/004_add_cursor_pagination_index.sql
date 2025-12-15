-- Migration: Add composite index for cursor-based pagination
-- This index enables stable, efficient cursor pagination with (created_at DESC, id DESC)
-- preventing duplicates and missing items under concurrent inserts

-- Add composite index for cursor pagination
CREATE INDEX IF NOT EXISTS orders_created_at_id_idx ON orders (created_at DESC, id DESC);

-- Note: The existing orders_created_at_idx index is still useful for simple ORDER BY created_at queries
-- The new composite index will be used for cursor pagination queries with WHERE (created_at, id) < (?, ?)
