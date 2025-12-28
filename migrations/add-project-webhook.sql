-- Add webhook_url to projects table for default project-level webhook
ALTER TABLE projects ADD COLUMN IF NOT EXISTS webhook_url TEXT;

-- Add notification preferences
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notify_on_rebuild BOOLEAN DEFAULT TRUE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notify_on_approve BOOLEAN DEFAULT TRUE;
