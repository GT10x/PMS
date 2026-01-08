-- Add stakeholders column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS stakeholders TEXT[] DEFAULT '{}';

-- Verify the column was added
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'stakeholders';
