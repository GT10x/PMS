-- Report Replies Table for threaded conversations
CREATE TABLE IF NOT EXISTS report_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_report_replies_report_id ON report_replies(report_id);
CREATE INDEX IF NOT EXISTS idx_report_replies_user_id ON report_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_report_replies_created_at ON report_replies(created_at);

-- Enable RLS
ALTER TABLE report_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policy for report_replies
CREATE POLICY "Users can view replies for reports they have access to"
  ON report_replies FOR SELECT
  USING (true);

CREATE POLICY "Users can create replies"
  ON report_replies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own replies"
  ON report_replies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own replies"
  ON report_replies FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON report_replies TO authenticated;
GRANT ALL ON report_replies TO anon;
