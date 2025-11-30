-- ================================================================
-- MAKE EMAIL COLUMN NULLABLE IN USER_PROFILES
-- COPY THIS ENTIRE SQL AND RUN IN SUPABASE SQL EDITOR
-- URL: https://supabase.com/dashboard/project/loihxoyrutbzmqscdknk/sql/new
-- ================================================================

-- Make email column nullable (optional)
ALTER TABLE user_profiles
ALTER COLUMN email DROP NOT NULL;

-- Verify the change
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles' AND column_name = 'email';
