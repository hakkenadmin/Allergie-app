-- ============================================
-- Migration: Add is_published and note columns to menu_items
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Add is_published column (default TRUE)
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE NOT NULL;

-- Add note column
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS note TEXT;

-- Create index for is_published for better query performance
CREATE INDEX IF NOT EXISTS idx_menu_items_is_published ON menu_items(is_published);

-- ============================================
-- Notes:
-- - is_published: Controls whether menu item is visible to users (TRUE) or hidden (FALSE)
-- - note: Additional notes/comments about the menu item
-- - Both columns are nullable except is_published which defaults to TRUE
-- ============================================

