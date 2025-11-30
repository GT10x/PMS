-- ================================================================
-- ADD END_DATE COLUMN TO PROJECTS TABLE
-- Run this in Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/loihxoyrutbzmqscdknk/sql/new
-- ================================================================

-- Add end_date column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'projects'
        AND column_name = 'end_date'
    ) THEN
        ALTER TABLE projects ADD COLUMN end_date DATE;
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
AND column_name IN ('start_date', 'end_date')
ORDER BY column_name;
