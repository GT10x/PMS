-- Table for project modules/features planning
CREATE TABLE IF NOT EXISTS project_modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT, -- Bullet points / detailed description in layman terms
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'on_hold')),
  eta DATE, -- Target completion date
  stakeholders TEXT[], -- Array of stakeholder names
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_project_modules_project_id ON project_modules(project_id);
CREATE INDEX IF NOT EXISTS idx_project_modules_status ON project_modules(status);
CREATE INDEX IF NOT EXISTS idx_project_modules_priority ON project_modules(priority);

-- Grant permissions
GRANT ALL ON project_modules TO authenticated;
GRANT ALL ON project_modules TO anon;
