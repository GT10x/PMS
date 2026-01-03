-- Add edited_at and deleted_at columns to project_reports for edit/delete tracking
ALTER TABLE project_reports ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP;
ALTER TABLE project_reports ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE project_reports ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
