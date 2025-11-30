-- ================================================================
-- FIX USER PROFILES ID AUTO-GENERATION
-- COPY THIS ENTIRE SQL AND RUN IN SUPABASE SQL EDITOR
-- URL: https://supabase.com/dashboard/project/loihxoyrutbzmqscdknk/sql/new
-- ================================================================

-- Add UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set default value for id column to auto-generate UUIDs
ALTER TABLE user_profiles
ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Verify the change
SELECT column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles' AND column_name = 'id';
