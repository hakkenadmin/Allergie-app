-- ============================================
-- Migration: Move from allergies (DECIMAL[]) to separate columns
-- Migrates all existing allergies to allergies_contains
-- ============================================

-- Step 1: Add new columns
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS allergies_contains DECIMAL[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS allergies_share DECIMAL[] DEFAULT '{}';

-- Step 2: Set empty arrays for all items (migration already completed)
-- Note: If you need to migrate data, do it before running this script

-- Step 3: Set empty arrays for items with NULL or empty allergies
UPDATE menu_items
SET allergies_contains = '{}'
WHERE allergies_contains IS NULL;

UPDATE menu_items
SET allergies_share = '{}'
WHERE allergies_share IS NULL;

-- Step 4: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_menu_items_allergies_contains ON menu_items USING GIN(allergies_contains);
CREATE INDEX IF NOT EXISTS idx_menu_items_allergies_share ON menu_items USING GIN(allergies_share);

-- Step 5: Make columns NOT NULL
ALTER TABLE menu_items
ALTER COLUMN allergies_contains SET NOT NULL,
ALTER COLUMN allergies_share SET NOT NULL;

-- Step 6: Verify the columns
-- Check how many items have allergies
SELECT 
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE array_length(allergies_contains, 1) > 0) as items_with_contains,
  COUNT(*) FILTER (WHERE array_length(allergies_share, 1) > 0) as items_with_share
FROM menu_items;

-- Step 7: Show sample data
SELECT 
  id,
  menu_name,
  allergies_contains,
  allergies_share
FROM menu_items
LIMIT 10;

