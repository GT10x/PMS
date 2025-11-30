-- ================================================================
-- ADD REACT NATIVE DEVELOPER ROLE TO PMS
-- COPY THIS ENTIRE SQL AND RUN IN SUPABASE SQL EDITOR
-- URL: https://supabase.com/dashboard/project/loihxoyrutbzmqscdknk/sql/new
-- ================================================================

-- Update the role constraint to include 'react_native_developer'
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
CHECK (role IN ('developer', 'admin', 'project_manager', 'cto', 'consultant', 'tester', 'react_native_developer'));

-- Verify the constraint was updated
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'user_profiles_role_check';
