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
-- user_roles (store user roles: Admin, Store-Admin)
-- ============================================
CREATE TABLE IF NOT EXISTS user_roles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Store-Admin')),
  store_id BIGINT REFERENCES stores(id) ON DELETE SET NULL,  -- For Store-Admin: which store they manage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_store_id ON user_roles(store_id);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Anyone can read user roles (for checking permissions)
DROP POLICY IF EXISTS "Anyone can read user roles" ON user_roles;
CREATE POLICY "Anyone can read user roles"
  ON user_roles
  FOR SELECT
  USING (true);

-- Only admins can insert/update user roles
DROP POLICY IF EXISTS "Admins can manage user roles" ON user_roles;
CREATE POLICY "Admins can manage user roles"
  ON user_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'Admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'Admin'
    )
  );

DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Helper function to check if user is Admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = user_uuid AND role = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is Store-Admin
CREATE OR REPLACE FUNCTION is_store_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = user_uuid AND role = 'Store-Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM user_roles
    WHERE user_id = user_uuid
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get store_id for Store-Admin
CREATE OR REPLACE FUNCTION get_store_admin_store_id(user_uuid UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT store_id FROM user_roles
    WHERE user_id = user_uuid AND role = 'Store-Admin'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

DROP POLICY IF EXISTS "Admins and Store-Admins can update stores" ON stores;
CREATE POLICY "Admins and Store-Admins can update stores"
  ON stores
  FOR UPDATE
  USING (
    is_admin(auth.uid()) OR 
    (is_store_admin(auth.uid()) AND id = get_store_admin_store_id(auth.uid()))
  )
  WITH CHECK (
    is_admin(auth.uid()) OR 
    (is_store_admin(auth.uid()) AND id = get_store_admin_store_id(auth.uid()))
  );

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
  is_published BOOLEAN DEFAULT TRUE NOT NULL,
  note TEXT,
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

DROP POLICY IF EXISTS "Admins and Store-Admins can insert menu items" ON menu_items;
CREATE POLICY "Admins and Store-Admins can insert menu items"
  ON menu_items
  FOR INSERT
  WITH CHECK (
    is_admin(auth.uid()) OR 
    (is_store_admin(auth.uid()) AND store_name IN (
      SELECT store_name FROM stores WHERE id = get_store_admin_store_id(auth.uid())
    ))
  );

DROP POLICY IF EXISTS "Admins and Store-Admins can update menu items" ON menu_items;
CREATE POLICY "Admins and Store-Admins can update menu items"
  ON menu_items
  FOR UPDATE
  USING (
    is_admin(auth.uid()) OR 
    (is_store_admin(auth.uid()) AND store_name IN (
      SELECT store_name FROM stores WHERE id = get_store_admin_store_id(auth.uid())
    ))
  )
  WITH CHECK (
    is_admin(auth.uid()) OR 
    (is_store_admin(auth.uid()) AND store_name IN (
      SELECT store_name FROM stores WHERE id = get_store_admin_store_id(auth.uid())
    ))
  );

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
-- Migration: Create user_roles table
-- Run this if you already have a database
-- ============================================
-- See user_roles table creation above (lines 18-75)
-- 
-- After creating the table, you can assign roles:
-- 
-- Step 1: Find your user UUID
-- SELECT id, email FROM auth.users;
--
-- Step 2: Find store IDs (if assigning Store-Admin role)
-- SELECT id, store_name FROM stores;
--
-- Step 3: Assign Admin role (replace 'YOUR-USER-UUID-HERE' with actual UUID)
-- INSERT INTO user_roles (user_id, role) 
-- VALUES ('YOUR-USER-UUID-HERE', 'Admin')
-- ON CONFLICT (user_id) DO UPDATE SET role = 'Admin';
--
-- Step 4: Assign Store-Admin role (replace UUID and store ID with actual values)
-- INSERT INTO user_roles (user_id, role, store_id) 
-- VALUES ('YOUR-USER-UUID-HERE', 'Store-Admin', 1)
-- ON CONFLICT (user_id) DO UPDATE SET role = 'Store-Admin', store_id = 1;

-- ============================================
-- Notes:
-- - user_roles: stores user roles (Admin, Store-Admin) linked to auth.users.
--   Admin: Full access to all stores and menu items.
--   Store-Admin: Access limited to their assigned store (via store_id).
-- - user_allergies: stores only allergy_id (INT) referencing COMMON_ALLERGIES.id from code.
--   All allergies must be declared in COMMON_ALLERGIES - no custom allergies allowed.
-- - menu_items.allergies: DECIMAL[] array storing allergy IDs from COMMON_ALLERGIES.
-- - stores/menu_items: public read, Admin/Store-Admin can insert/update.
-- - stores.verified: 'y' or 'n' to indicate if store information is verified.
-- - RLS is enabled on all tables.
-- - updated_at triggers keep timestamps fresh on update.
-- - Helper functions: is_admin(), is_store_admin(), get_user_role(), get_store_admin_store_id()
-- ============================================

