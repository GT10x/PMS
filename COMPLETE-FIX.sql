-- ================================================================
-- COMPLETE FIX FOR USER_PROFILES TABLE
-- Run this ONCE to fix all issues
-- ================================================================

-- Drop the foreign key constraint that's causing the issue
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Already done but ensuring they're applied:
-- Make sure UUID extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set auto-generation for ID
ALTER TABLE user_profiles ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Make email nullable
ALTER TABLE user_profiles ALTER COLUMN email DROP NOT NULL;

-- Verify everything
SELECT
  'user_profiles' as table_name,
  column_name,
  column_default,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name IN ('id', 'email')
ORDER BY column_name;
