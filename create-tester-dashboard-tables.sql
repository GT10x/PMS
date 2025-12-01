-- Tester Dashboard Database Schema
-- Run this in Supabase SQL Editor

-- 1. Project Versions Table
CREATE TABLE IF NOT EXISTS project_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_number VARCHAR(50) NOT NULL,
  release_date TIMESTAMP WITH TIME ZONE,
  description TEXT,
  status VARCHAR(20) DEFAULT 'testing' CHECK (status IN ('testing', 'stable', 'deprecated')),
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Version Test Cases Table
CREATE TABLE IF NOT EXISTS version_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES project_versions(id) ON DELETE CASCADE,
  test_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT,
  steps TEXT[], -- Array of test steps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Test Results Table
CREATE TABLE IF NOT EXISTS test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES version_test_cases(id) ON DELETE CASCADE,
  tester_notes TEXT,
  status VARCHAR(20) CHECK (status IN ('', 'pass', 'fail', 'blocked')), -- '' means not tested yet
  attachments TEXT[], -- Array of file URLs from Supabase Storage
  tested_by UUID REFERENCES user_profiles(id),
  tested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Project Reports Table (Ad-hoc bugs, features, improvements, tasks)
CREATE TABLE IF NOT EXISTS project_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('bug', 'feature', 'improvement', 'task')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'wont_fix')),
  browser VARCHAR(100),
  device VARCHAR(100),
  reported_by UUID NOT NULL REFERENCES user_profiles(id),
  assigned_to UUID REFERENCES user_profiles(id),
  attachments TEXT[], -- Array of file URLs from Supabase Storage
  dev_notes TEXT,
  version_id UUID REFERENCES project_versions(id), -- Optional: Link to specific version
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_project_versions_project_id ON project_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_version_test_cases_version_id ON version_test_cases(version_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test_case_id ON test_results(test_case_id);
CREATE INDEX IF NOT EXISTS idx_project_reports_project_id ON project_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_project_reports_status ON project_reports(status);
CREATE INDEX IF NOT EXISTS idx_project_reports_assigned_to ON project_reports(assigned_to);

-- Add RLS (Row Level Security) policies
ALTER TABLE project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE version_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view versions for projects they're members of
CREATE POLICY "Users can view versions for their projects"
  ON project_versions FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Policy: PM and Admin can create versions
CREATE POLICY "PM and Admin can create versions"
  ON project_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND (is_admin = true OR role = 'project_manager')
    )
  );

-- Policy: PM and Admin can update versions
CREATE POLICY "PM and Admin can update versions"
  ON project_versions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND (is_admin = true OR role = 'project_manager')
    )
  );

-- Policy: Users can view test cases for versions they have access to
CREATE POLICY "Users can view test cases"
  ON version_test_cases FOR SELECT
  USING (
    version_id IN (
      SELECT id FROM project_versions WHERE project_id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Policy: PM and Admin can create test cases
CREATE POLICY "PM and Admin can create test cases"
  ON version_test_cases FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND (is_admin = true OR role = 'project_manager')
    )
  );

-- Policy: Users can view test results
CREATE POLICY "Users can view test results"
  ON test_results FOR SELECT
  USING (
    test_case_id IN (
      SELECT id FROM version_test_cases WHERE version_id IN (
        SELECT id FROM project_versions WHERE project_id IN (
          SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Policy: Project members can create and update test results
CREATE POLICY "Project members can manage test results"
  ON test_results FOR ALL
  USING (
    test_case_id IN (
      SELECT id FROM version_test_cases WHERE version_id IN (
        SELECT id FROM project_versions WHERE project_id IN (
          SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Policy: Users can view reports for their projects
CREATE POLICY "Users can view project reports"
  ON project_reports FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Policy: Project members can create reports
CREATE POLICY "Project members can create reports"
  ON project_reports FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Policy: PM and Admin can update reports (for assignment and status changes)
CREATE POLICY "PM and Admin can update reports"
  ON project_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND (is_admin = true OR role = 'project_manager')
    )
    OR
    reported_by = auth.uid() -- Users can update their own reports
  );

-- Add a trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_project_versions_updated_at BEFORE UPDATE ON project_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_results_updated_at BEFORE UPDATE ON test_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_reports_updated_at BEFORE UPDATE ON project_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
