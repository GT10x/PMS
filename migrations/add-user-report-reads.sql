-- Table to track when users last viewed each report (for unread reply notifications)
CREATE TABLE IF NOT EXISTS user_report_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES project_reports(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, report_id)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_report_reads_user_id ON user_report_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_report_reads_report_id ON user_report_reads(report_id);

-- Grant permissions
GRANT ALL ON user_report_reads TO authenticated;
GRANT ALL ON user_report_reads TO anon;
