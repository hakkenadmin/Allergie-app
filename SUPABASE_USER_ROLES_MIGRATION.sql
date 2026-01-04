-- ============================================
-- Migration Script: Add User Roles (Admin and Store-Admin)
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Step 1: Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Store-Admin')),
  store_id BIGINT REFERENCES stores(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_store_id ON user_roles(store_id);

-- Step 3: Enable Row Level Security
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
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

-- Step 5: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Create helper functions
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

-- Step 7: Update RLS policies for stores table
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

-- Step 8: Update RLS policies for menu_items table
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

-- ============================================
-- Usage Examples:
-- ============================================
-- 
-- 1. Find your user UUID:
--    SELECT id, email FROM auth.users;
--
-- 2. Find store IDs:
--    SELECT id, store_name FROM stores;
--
-- 3. Assign Admin role (replace YOUR-USER-UUID with actual UUID):
--    INSERT INTO user_roles (user_id, role) 
--    VALUES ('YOUR-USER-UUID', 'Admin')
--    ON CONFLICT (user_id) DO UPDATE SET role = 'Admin';
--
-- 4. Assign Store-Admin role (replace UUID and store ID):
--    INSERT INTO user_roles (user_id, role, store_id) 
--    VALUES ('YOUR-USER-UUID', 'Store-Admin', 1)
--    ON CONFLICT (user_id) DO UPDATE SET role = 'Store-Admin', store_id = 1;
--
-- 5. Check user roles:
--    SELECT ur.*, au.email 
--    FROM user_roles ur
--    JOIN auth.users au ON ur.user_id = au.id;
--
-- ============================================

