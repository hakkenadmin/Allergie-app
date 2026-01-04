-- ============================================
-- Migration Script: Add User Roles (is_admin, is_store_admin)
-- Simple boolean column approach
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Step 1: Create user_profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT FALSE NOT NULL,
  is_store_admin BOOLEAN DEFAULT FALSE NOT NULL,
  store_id BIGINT REFERENCES stores(id) ON DELETE SET NULL,  -- For Store-Admin: which store they manage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON user_profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_store_admin ON user_profiles(is_store_admin);
CREATE INDEX IF NOT EXISTS idx_user_profiles_store_id ON user_profiles(store_id);

-- Step 3: Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
-- Anyone can read user profiles (for checking permissions)
DROP POLICY IF EXISTS "Anyone can read user profiles" ON user_profiles;
CREATE POLICY "Anyone can read user profiles"
  ON user_profiles
  FOR SELECT
  USING (true);

-- Users can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Only admins can update user profiles
DROP POLICY IF EXISTS "Admins can update user profiles" ON user_profiles;
CREATE POLICY "Admins can update user profiles"
  ON user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Users can insert their own profile (on signup)
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Step 5: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Create helper functions
-- Helper function to check if user is Admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE((
    SELECT is_admin FROM user_profiles
    WHERE id = user_uuid
  ), FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is Store-Admin
CREATE OR REPLACE FUNCTION is_store_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE((
    SELECT is_store_admin FROM user_profiles
    WHERE id = user_uuid
  ), FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get store_id for Store-Admin
CREATE OR REPLACE FUNCTION get_store_admin_store_id(user_uuid UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT store_id FROM user_profiles
    WHERE id = user_uuid AND is_store_admin = TRUE
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, is_admin, is_store_admin)
  VALUES (NEW.id, FALSE, FALSE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Step 8: Update RLS policies for stores table
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

-- Step 9: Update RLS policies for menu_items table
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

-- Step 10: Create function to get users with emails (for admin user selector)
-- This function allows admins to see all users in the system
CREATE OR REPLACE FUNCTION get_users_with_emails()
RETURNS TABLE (
  id UUID,
  email TEXT
) 
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  is_user_admin BOOLEAN;
BEGIN
  -- Check if caller is admin
  -- First check if user_profiles exists for this user
  SELECT is_admin INTO is_user_admin
  FROM user_profiles
  WHERE id = auth.uid();
  
  -- If user_profiles doesn't exist for this user, allow if no admins exist yet
  IF is_user_admin IS NULL THEN
    -- If no admins exist, allow access (for initial setup)
    IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE is_admin = TRUE LIMIT 1) THEN
      is_user_admin := TRUE;
    ELSE
      is_user_admin := FALSE;
    END IF;
  END IF;
  
  -- If still not admin, raise exception
  IF NOT is_user_admin THEN
    RAISE EXCEPTION 'Only admins can view all users. Current user is not an admin.';
  END IF;

  -- Return all users from auth.users
  RETURN QUERY
  SELECT 
    au.id,
    COALESCE(au.email::TEXT, 'No email') as email
  FROM auth.users au
  ORDER BY au.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_users_with_emails() TO authenticated;

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
-- 3. Make a user an Admin (replace YOUR-USER-UUID with actual UUID):
--    INSERT INTO user_profiles (id, is_admin, is_store_admin) 
--    VALUES ('YOUR-USER-UUID', TRUE, FALSE)
--    ON CONFLICT (id) DO UPDATE SET is_admin = TRUE, is_store_admin = FALSE;
--
-- 4. Make a user a Store-Admin (replace UUID and store ID):
--    INSERT INTO user_profiles (id, is_admin, is_store_admin, store_id) 
--    VALUES ('YOUR-USER-UUID', FALSE, TRUE, 1)
--    ON CONFLICT (id) DO UPDATE SET is_admin = FALSE, is_store_admin = TRUE, store_id = 1;
--
-- 5. Make a user both Admin and Store-Admin:
--    UPDATE user_profiles 
--    SET is_admin = TRUE, is_store_admin = TRUE, store_id = 1
--    WHERE id = 'YOUR-USER-UUID';
--
-- 6. Check user profiles:
--    SELECT up.*, au.email 
--    FROM user_profiles up
--    JOIN auth.users au ON up.id = au.id;
--
-- 7. Remove admin status:
--    UPDATE user_profiles 
--    SET is_admin = FALSE 
--    WHERE id = 'YOUR-USER-UUID';
--
-- ============================================

