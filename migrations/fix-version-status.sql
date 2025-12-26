-- Fix project_versions status column to accept new status values
-- Current values might be: testing, stable, deprecated
-- Need to add: released, needs_fixes, in_development

-- Drop any existing constraint on the status column
ALTER TABLE project_versions DROP CONSTRAINT IF EXISTS project_versions_status_check;

-- Change the column type to TEXT to accept any value
ALTER TABLE project_versions ALTER COLUMN status TYPE TEXT;

-- Add new constraint with all possible values
ALTER TABLE project_versions ADD CONSTRAINT project_versions_status_check
  CHECK (status IN ('testing', 'stable', 'deprecated', 'released', 'needs_fixes', 'in_development'));

-- Update any 'stable' to 'released' for consistency (optional)
-- UPDATE project_versions SET status = 'released' WHERE status = 'stable';
