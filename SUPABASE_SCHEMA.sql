-- ============================================
-- Supabase Database Schema for Allergie App
-- ============================================
-- Run this SQL in your Supabase SQL Editor to recreate the core tables.
-- This defines three tables: user_allergies, stores, menu_items.
-- ============================================

-- Utility: update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- user_allergies (store only user selections from COMMON_ALLERGIES)
-- ============================================
CREATE TABLE IF NOT EXISTS user_allergies (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allergy_id INT NOT NULL,        -- References COMMON_ALLERGIES.id (defined in code)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, allergy_id)     -- Prevent duplicate selections
);

CREATE INDEX IF NOT EXISTS idx_user_allergies_user_id ON user_allergies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_allergies_allergy_id ON user_allergies(allergy_id);
CREATE INDEX IF NOT EXISTS idx_user_allergies_created_at ON user_allergies(created_at DESC);

ALTER TABLE user_allergies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own allergies" ON user_allergies;
CREATE POLICY "Users can manage their own allergies"
  ON user_allergies
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_allergies_updated_at ON user_allergies;
CREATE TRIGGER update_user_allergies_updated_at
    BEFORE UPDATE ON user_allergies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- stores
-- ============================================
CREATE TABLE IF NOT EXISTS stores (
  id BIGSERIAL PRIMARY KEY,
  store_name TEXT NOT NULL UNIQUE,
  description TEXT,
  managing_company TEXT,
  address TEXT,
  phone TEXT,
  website TEXT,
  verified TEXT DEFAULT 'n' CHECK (verified IN ('y', 'n')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stores_store_name ON stores(store_name);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read stores" ON stores;
CREATE POLICY "Anyone can read stores"
  ON stores
  FOR SELECT
  USING (true);

DROP TRIGGER IF EXISTS update_stores_updated_at ON stores;
CREATE TRIGGER update_stores_updated_at
    BEFORE UPDATE ON stores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- menu_items
-- ============================================
CREATE TABLE IF NOT EXISTS menu_items (
  id BIGSERIAL PRIMARY KEY,
  store_id BIGINT REFERENCES stores(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  menu_name TEXT NOT NULL,
  description TEXT,
  allergies DECIMAL[] NOT NULL DEFAULT '{}',
  price DECIMAL(10,2),
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_store_id ON menu_items(store_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_store_name ON menu_items(store_name);
CREATE INDEX IF NOT EXISTS idx_menu_items_allergies ON menu_items USING GIN(allergies);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read menu items" ON menu_items;
CREATE POLICY "Anyone can read menu items"
  ON menu_items
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert menu items" ON menu_items;
CREATE POLICY "Authenticated users can insert menu items"
  ON menu_items
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS update_menu_items_updated_at ON menu_items;
CREATE TRIGGER update_menu_items_updated_at
    BEFORE UPDATE ON menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Migration: Add verified column to stores table
-- Run this if you already have a stores table
-- ============================================
-- ALTER TABLE stores ADD COLUMN IF NOT EXISTS verified TEXT DEFAULT 'n' CHECK (verified IN ('y', 'n'));

-- ============================================
-- Notes:
-- - user_allergies: stores only allergy_id (INT) referencing COMMON_ALLERGIES.id from code.
--   All allergies must be declared in COMMON_ALLERGIES - no custom allergies allowed.
-- - menu_items.allergies: DECIMAL[] array storing allergy IDs from COMMON_ALLERGIES.
-- - stores/menu_items: public read, authenticated insert (adjust as needed).
-- - stores.verified: 'y' or 'n' to indicate if store information is verified.
-- - RLS is enabled on all tables.
-- - updated_at triggers keep timestamps fresh on update.
-- ============================================

