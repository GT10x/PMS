-- ================================================================
-- COPY THIS ENTIRE SQL AND RUN IN SUPABASE SQL EDITOR
-- URL: https://supabase.com/dashboard/project/loihxoyrutbzmqscdknk/sql/new
-- ================================================================

-- Step 1: Add the missing columns
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Step 2: Update the check constraint to allow more roles
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('developer', 'admin', 'project_manager', 'cto', 'consultant', 'tester'));

-- Step 3: Update your user with admin access
UPDATE user_profiles
SET
  password_hash = '$2b$10$0iko/6ITLNHlP9E5P.BjjeL5/AyEqVasz8Ac6EhoeJXLnPF12DxSm',  -- Password: Admin@123
  is_admin = TRUE,
  role = 'admin',
  username = 'piush008'
WHERE email = 'piush008@gmail.com';

-- Step 4: Verify the update worked
SELECT id, email, full_name, role, is_admin, username, created_at
FROM user_profiles
WHERE email = 'piush008@gmail.com';
