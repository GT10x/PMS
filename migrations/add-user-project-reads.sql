-- Track when users last viewed chat/reports for each project (for notification counts)
CREATE TABLE IF NOT EXISTS user_project_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  last_chat_read_at TIMESTAMP DEFAULT NOW(),
  last_reports_read_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_project_reads_user ON user_project_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_project_reads_project ON user_project_reads(project_id);
