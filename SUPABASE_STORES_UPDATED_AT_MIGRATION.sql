-- ============================================
-- Migration: Add updated_at column to stores table
-- and update security policies
-- ============================================
-- This script:
-- 1. Adds updated_at column if it doesn't exist
-- 2. Creates/updates the trigger to auto-update updated_at
-- 3. Updates RLS policies for stores table
-- ============================================

-- Step 1: Add updated_at column if it doesn't exist
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 2: Update existing rows to have updated_at = created_at if updated_at is NULL
UPDATE stores 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Step 3: Ensure updated_at is NOT NULL (set default for future inserts)
ALTER TABLE stores 
ALTER COLUMN updated_at SET DEFAULT NOW();

-- Step 4: Create or replace the trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 5: Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS update_stores_updated_at ON stores;
CREATE TRIGGER update_stores_updated_at
    BEFORE UPDATE ON stores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Update RLS policies for stores table
-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read stores" ON stores;
DROP POLICY IF EXISTS "Authenticated users can update stores" ON stores;
DROP POLICY IF EXISTS "Admins and Store-Admins can update stores" ON stores;
DROP POLICY IF EXISTS "Admins can insert stores" ON stores;
DROP POLICY IF EXISTS "Admins and Store-Admins can insert stores" ON stores;

-- Recreate read policy (anyone can read)
CREATE POLICY "Anyone can read stores"
  ON stores
  FOR SELECT
  USING (true);

-- Policy for authenticated users to update stores
CREATE POLICY "Authenticated users can update stores"
  ON stores
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Policy for admins and store-admins to update stores
-- Option 1: If using helper functions (from SUPABASE_SCHEMA.sql)
-- Uncomment this if you have is_admin() and is_store_admin() functions:
/*
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
*/

-- Option 2: If using user_profiles table (from SUPABASE_USER_ROLES_SIMPLE.sql)
-- Use this if you have user_profiles table with is_admin and is_store_admin columns:
CREATE POLICY "Admins and Store-Admins can update stores"
  ON stores
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    ) OR 
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND is_store_admin = TRUE 
      AND store_id = stores.id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    ) OR 
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND is_store_admin = TRUE 
      AND store_id = stores.id
    )
  );

-- Policy for admins to insert stores
CREATE POLICY "Admins can insert stores"
  ON stores
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Create index on updated_at for better query performance
CREATE INDEX IF NOT EXISTS idx_stores_updated_at ON stores(updated_at DESC);

-- ============================================
-- Verification queries (optional - run to verify)
-- ============================================
-- Check if column exists:
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'stores' AND column_name = 'updated_at';

-- Check if trigger exists:
-- SELECT trigger_name, event_manipulation, event_object_table 
-- FROM information_schema.triggers 
-- WHERE trigger_name = 'update_stores_updated_at';

-- Check policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'stores';

