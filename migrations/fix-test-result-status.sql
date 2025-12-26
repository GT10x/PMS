-- Fix version_test_results status column to accept new status values
-- Old values: pending, passed, failed, blocked, skipped
-- New values: pending, properly_working, not_working, partially_working

-- First, drop any existing constraint on the status column
ALTER TABLE version_test_results DROP CONSTRAINT IF EXISTS version_test_results_status_check;

-- Change the column type to TEXT to accept any value
ALTER TABLE version_test_results ALTER COLUMN status TYPE TEXT;

-- Add new constraint with updated values (optional - for data integrity)
ALTER TABLE version_test_results ADD CONSTRAINT version_test_results_status_check
  CHECK (status IN ('pending', 'properly_working', 'not_working', 'partially_working', 'passed', 'failed', 'blocked', 'skipped'));

-- Update any existing 'passed' status to 'properly_working' for consistency
UPDATE version_test_results SET status = 'properly_working' WHERE status = 'passed';

-- Update any existing 'failed' status to 'not_working' for consistency
UPDATE version_test_results SET status = 'not_working' WHERE status = 'failed';
