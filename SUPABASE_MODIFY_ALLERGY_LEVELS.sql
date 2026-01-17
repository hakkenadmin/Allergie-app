-- ============================================
-- SQL Script: Modify Allergy Levels in menu_items
-- ============================================
-- This script provides various operations to modify allergy levels
-- (contains vs share) in the menu_items table
-- ============================================

-- ============================================
-- EXAMPLE 1: Move an allergy from contains to share
-- ============================================
-- Move allergy ID 1 from contains to share for a specific menu item
UPDATE menu_items
SET 
  allergies_contains = array_remove(allergies_contains, 1),
  allergies_share = CASE 
    WHEN 1 = ANY(allergies_share) THEN allergies_share
    ELSE array_append(allergies_share, 1)
  END
WHERE id = 123; -- Replace 123 with actual menu item ID

-- ============================================
-- EXAMPLE 2: Move an allergy from share to contains
-- ============================================
-- Move allergy ID 5 from share to contains for a specific menu item
UPDATE menu_items
SET 
  allergies_share = array_remove(allergies_share, 5),
  allergies_contains = CASE 
    WHEN 5 = ANY(allergies_contains) THEN allergies_contains
    ELSE array_append(allergies_contains, 5)
  END
WHERE id = 123; -- Replace 123 with actual menu item ID

-- ============================================
-- EXAMPLE 3: Add an allergy to contains column
-- ============================================
-- Add allergy ID 3 to contains for a specific menu item
UPDATE menu_items
SET 
  allergies_contains = CASE 
    WHEN 3 = ANY(allergies_contains) THEN allergies_contains
    ELSE array_append(allergies_contains, 3)
  END,
  allergies_share = array_remove(allergies_share, 3) -- Remove from share if present
WHERE id = 123; -- Replace 123 with actual menu item ID

-- ============================================
-- EXAMPLE 4: Add an allergy to share column
-- ============================================
-- Add allergy ID 7 to share for a specific menu item
UPDATE menu_items
SET 
  allergies_share = CASE 
    WHEN 7 = ANY(allergies_share) THEN allergies_share
    ELSE array_append(allergies_share, 7)
  END,
  allergies_contains = array_remove(allergies_contains, 7) -- Remove from contains if present
WHERE id = 123; -- Replace 123 with actual menu item ID

-- ============================================
-- EXAMPLE 5: Remove an allergy completely
-- ============================================
-- Remove allergy ID 2 from both contains and share
UPDATE menu_items
SET 
  allergies_contains = array_remove(allergies_contains, 2),
  allergies_share = array_remove(allergies_share, 2)
WHERE id = 123; -- Replace 123 with actual menu item ID

-- ============================================
-- EXAMPLE 6: Bulk update - Move allergy for all menu items in a store
-- ============================================
-- Move allergy ID 1 from contains to share for all items in a specific store
UPDATE menu_items
SET 
  allergies_contains = array_remove(allergies_contains, 1),
  allergies_share = CASE 
    WHEN 1 = ANY(allergies_share) THEN allergies_share
    ELSE array_append(allergies_share, 1)
  END
WHERE store_id = 456; -- Replace 456 with actual store ID

-- ============================================
-- EXAMPLE 7: Bulk update - Move allergy for all menu items by store name
-- ============================================
-- Move allergy ID 3 from share to contains for all items in a store
UPDATE menu_items
SET 
  allergies_share = array_remove(allergies_share, 3),
  allergies_contains = CASE 
    WHEN 3 = ANY(allergies_contains) THEN allergies_contains
    ELSE array_append(allergies_contains, 3)
  END
WHERE store_name = '店舗名'; -- Replace with actual store name

-- ============================================
-- EXAMPLE 8: Swap allergy levels for a specific menu item
-- ============================================
-- Move all allergies from contains to share and vice versa for a menu item
UPDATE menu_items
SET 
  allergies_contains = allergies_share,
  allergies_share = allergies_contains
WHERE id = 123; -- Replace 123 with actual menu item ID

-- ============================================
-- EXAMPLE 9: Set specific allergies for a menu item
-- ============================================
-- Set contains = [1, 3, 5] and share = [2, 4] for a menu item
UPDATE menu_items
SET 
  allergies_contains = ARRAY[1, 3, 5]::DECIMAL[],
  allergies_share = ARRAY[2, 4]::DECIMAL[]
WHERE id = 123; -- Replace 123 with actual menu item ID

-- ============================================
-- EXAMPLE 10: Move multiple allergies at once
-- ============================================
-- Move allergies [1, 2, 3] from contains to share for a menu item
UPDATE menu_items
SET 
  allergies_contains = allergies_contains - ARRAY[1, 2, 3]::DECIMAL[],
  allergies_share = (allergies_share || ARRAY[1, 2, 3]::DECIMAL[]) - 
                     (SELECT array_agg(unnest) FROM unnest(allergies_share) WHERE unnest = ANY(ARRAY[1, 2, 3]::DECIMAL[]))
WHERE id = 123; -- Replace 123 with actual menu item ID

-- ============================================
-- EXAMPLE 11: Find menu items with a specific allergy in contains
-- ============================================
SELECT id, menu_name, allergies_contains, allergies_share
FROM menu_items
WHERE 1 = ANY(allergies_contains); -- Find items with allergy ID 1 in contains

-- ============================================
-- EXAMPLE 12: Find menu items with a specific allergy in share
-- ============================================
SELECT id, menu_name, allergies_contains, allergies_share
FROM menu_items
WHERE 5 = ANY(allergies_share); -- Find items with allergy ID 5 in share

-- ============================================
-- EXAMPLE 13: Find menu items with an allergy in either column
-- ============================================
SELECT id, menu_name, allergies_contains, allergies_share
FROM menu_items
WHERE 3 = ANY(allergies_contains) OR 3 = ANY(allergies_share); -- Find items with allergy ID 3

-- ============================================
-- EXAMPLE 14: Count items by allergy level
-- ============================================
SELECT 
  COUNT(*) FILTER (WHERE 1 = ANY(allergies_contains)) as contains_count,
  COUNT(*) FILTER (WHERE 1 = ANY(allergies_share)) as share_count,
  COUNT(*) FILTER (WHERE 1 = ANY(allergies_contains) OR 1 = ANY(allergies_share)) as total_count
FROM menu_items;

-- ============================================
-- EXAMPLE 15: Update based on menu name pattern
-- ============================================
-- Move allergy ID 1 from contains to share for items matching a pattern
UPDATE menu_items
SET 
  allergies_contains = array_remove(allergies_contains, 1),
  allergies_share = CASE 
    WHEN 1 = ANY(allergies_share) THEN allergies_share
    ELSE array_append(allergies_share, 1)
  END
WHERE menu_name LIKE '%パターン%'; -- Replace with your pattern

-- ============================================
-- HELPER FUNCTION: Move allergy between levels
-- ============================================
CREATE OR REPLACE FUNCTION move_allergy_level(
  p_menu_item_id BIGINT,
  p_allergy_id INTEGER,
  p_from_level TEXT, -- 'contains' or 'share'
  p_to_level TEXT   -- 'contains' or 'share'
)
RETURNS VOID AS $$
BEGIN
  IF p_from_level = 'contains' AND p_to_level = 'share' THEN
    UPDATE menu_items
    SET 
      allergies_contains = array_remove(allergies_contains, p_allergy_id),
      allergies_share = CASE 
        WHEN p_allergy_id = ANY(allergies_share) THEN allergies_share
        ELSE array_append(allergies_share, p_allergy_id)
      END
    WHERE id = p_menu_item_id;
  ELSIF p_from_level = 'share' AND p_to_level = 'contains' THEN
    UPDATE menu_items
    SET 
      allergies_share = array_remove(allergies_share, p_allergy_id),
      allergies_contains = CASE 
        WHEN p_allergy_id = ANY(allergies_contains) THEN allergies_contains
        ELSE array_append(allergies_contains, p_allergy_id)
      END
    WHERE id = p_menu_item_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Usage of helper function:
-- SELECT move_allergy_level(123, 1, 'contains', 'share'); -- Move allergy 1 from contains to share for item 123
-- SELECT move_allergy_level(123, 5, 'share', 'contains'); -- Move allergy 5 from share to contains for item 123

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Check current state of a menu item
SELECT id, menu_name, allergies_contains, allergies_share
FROM menu_items
WHERE id = 123; -- Replace 123 with actual menu item ID

-- Check all menu items with their allergy levels
SELECT 
  id,
  menu_name,
  store_name,
  allergies_contains,
  allergies_share,
  array_length(allergies_contains, 1) as contains_count,
  array_length(allergies_share, 1) as share_count
FROM menu_items
ORDER BY id;



