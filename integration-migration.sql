-- Add API key column to projects for external integrations
ALTER TABLE projects ADD COLUMN IF NOT EXISTS api_key VARCHAR(64) UNIQUE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deploy_url TEXT;

-- Create index for API key lookups
CREATE INDEX IF NOT EXISTS idx_projects_api_key ON projects(api_key);
