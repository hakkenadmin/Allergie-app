-- ============================================
-- Migration: Separate Contains and Share columns
-- Changes from JSONB object to separate DECIMAL[] columns
-- ============================================

-- Step 1: Add new columns
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS allergies_contains DECIMAL[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS allergies_share DECIMAL[] DEFAULT '{}';

-- Step 2: Set empty arrays for all items (migration already completed)
-- Note: The old 'allergies' column has been removed

-- Step 4: Set empty arrays for NULL values
UPDATE menu_items
SET 
  allergies_contains = '{}'
WHERE allergies_contains IS NULL;

UPDATE menu_items
SET 
  allergies_share = '{}'
WHERE allergies_share IS NULL;

-- Step 5: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_menu_items_allergies_contains ON menu_items USING GIN(allergies_contains);
CREATE INDEX IF NOT EXISTS idx_menu_items_allergies_share ON menu_items USING GIN(allergies_share);

-- Step 6: Make columns NOT NULL
ALTER TABLE menu_items
ALTER COLUMN allergies_contains SET NOT NULL,
ALTER COLUMN allergies_share SET NOT NULL;

-- Verification queries (uncomment to check):
-- SELECT id, menu_name, allergies_contains, allergies_share FROM menu_items LIMIT 10;
-- SELECT COUNT(*) FROM menu_items WHERE array_length(allergies_contains, 1) > 0;
-- SELECT COUNT(*) FROM menu_items WHERE array_length(allergies_share, 1) > 0;
