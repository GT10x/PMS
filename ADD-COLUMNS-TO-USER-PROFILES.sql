-- ================================================================
-- CRITICAL: Run this SQL in Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/loihxoyrutbzmqscdknk/sql/new
-- ================================================================

-- Step 1: Add missing columns to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Step 2: Update the existing user to be admin with password
UPDATE user_profiles
SET
  password_hash = '$2a$10$xUqZ5iY0HZqB4KxLz1jn5.VGvN8zP7yJ2KQ8RoK3mLQ7tN9pX8YWu',  -- Password: Admin@123
  is_admin = TRUE,
  full_name = 'Piush Thakker',
  role = 'admin',
  username = 'piush008'
WHERE email = 'piush008@gmail.com';

-- Step 3: Verify the update
SELECT id, email, full_name, role, is_admin, username, created_at
FROM user_profiles
WHERE email = 'piush008@gmail.com';
