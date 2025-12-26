-- Version Testing System Schema Migration
-- This adds support for detailed version info and two-way tester feedback

-- 1. Add new columns to project_versions table
ALTER TABLE project_versions
ADD COLUMN IF NOT EXISTS release_title TEXT,
ADD COLUMN IF NOT EXISTS release_summary TEXT,
ADD COLUMN IF NOT EXISTS deploy_url TEXT,
ADD COLUMN IF NOT EXISTS git_commit VARCHAR(64),
ADD COLUMN IF NOT EXISTS git_branch VARCHAR(128),
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS tester_id UUID REFERENCES user_profiles(id),
ADD COLUMN IF NOT EXISTS tested_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rebuild_requested BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rebuild_requested_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rebuild_notes TEXT;

-- 2. Create version_changes table (features, fixes, etc.)
CREATE TABLE IF NOT EXISTS version_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES project_versions(id) ON DELETE CASCADE,
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('feature', 'fix', 'improvement', 'breaking', 'security')),
    title TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create version_known_issues table
CREATE TABLE IF NOT EXISTS version_known_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES project_versions(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create version_test_cases table (test instructions from dev)
CREATE TABLE IF NOT EXISTS version_test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES project_versions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    steps JSONB DEFAULT '[]',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Create version_test_results table (tester feedback)
CREATE TABLE IF NOT EXISTS version_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_case_id UUID NOT NULL REFERENCES version_test_cases(id) ON DELETE CASCADE,
    tester_id UUID REFERENCES user_profiles(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed', 'blocked', 'skipped')),
    notes TEXT,
    attachments JSONB DEFAULT '[]',
    tested_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_version_changes_version_id ON version_changes(version_id);
CREATE INDEX IF NOT EXISTS idx_version_known_issues_version_id ON version_known_issues(version_id);
CREATE INDEX IF NOT EXISTS idx_version_test_cases_version_id ON version_test_cases(version_id);
CREATE INDEX IF NOT EXISTS idx_version_test_results_test_case_id ON version_test_results(test_case_id);
CREATE INDEX IF NOT EXISTS idx_project_versions_rebuild_requested ON project_versions(rebuild_requested) WHERE rebuild_requested = TRUE;

-- 7. Add webhook_secret to projects table for secure callbacks
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS webhook_secret VARCHAR(64);
