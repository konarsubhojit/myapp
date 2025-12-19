-- Create item_designs table to support multiple design variants per item
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

-- Add design_id column to order_items table
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS design_id INTEGER REFERENCES item_designs(id);

-- Migrate existing item images to item_designs table
-- For items with imageUrl, create a default design entry marked as primary
INSERT INTO item_designs (item_id, design_name, image_url, is_primary, display_order)
SELECT 
  id,
  'Default Design',
  image_url,
  true,
  0
FROM items
WHERE image_url IS NOT NULL AND image_url != ''
ON CONFLICT DO NOTHING;
