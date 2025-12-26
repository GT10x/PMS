-- Fix version_test_cases table schema
-- Add missing columns that the API expects

-- Add description column if it doesn't exist
ALTER TABLE version_test_cases
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add steps column if it doesn't exist (JSONB for array of steps)
ALTER TABLE version_test_cases
ADD COLUMN IF NOT EXISTS steps JSONB DEFAULT '[]';

-- Add sort_order column if it doesn't exist
ALTER TABLE version_test_cases
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Make test_number nullable if it exists (or provide default)
DO $$
BEGIN
    -- Try to alter test_number to have a default
    ALTER TABLE version_test_cases ALTER COLUMN test_number SET DEFAULT 0;
EXCEPTION
    WHEN undefined_column THEN
        NULL; -- Column doesn't exist, ignore
END $$;

-- Also make test_number nullable
DO $$
BEGIN
    ALTER TABLE version_test_cases ALTER COLUMN test_number DROP NOT NULL;
EXCEPTION
    WHEN undefined_column THEN
        NULL;
    WHEN others THEN
        NULL;
END $$;
