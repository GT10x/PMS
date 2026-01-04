const SUPABASE_URL = 'https://loihxoyrutbzmqscdknk.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvaWh4b3lydXRiem1xc2Nka25rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODk0MywiZXhwIjoyMDc5ODE0OTQzfQ.qrCt9_vF9twekh9DWRlmICtjkuiCFbqdfuggXz4GYL8';

const sql = `
CREATE TABLE IF NOT EXISTS report_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_replies_report_id ON report_replies(report_id);
CREATE INDEX IF NOT EXISTS idx_report_replies_user_id ON report_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_report_replies_created_at ON report_replies(created_at);

ALTER TABLE report_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on report_replies" ON report_replies;
CREATE POLICY "Allow all operations on report_replies" ON report_replies FOR ALL USING (true) WITH CHECK (true);
`;

async function runMigration() {
  console.log('Running report_replies table migration via Supabase SQL API...\n');

  // Try the pg/query endpoint
  try {
    const response = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'x-connection-encrypted': 'true'
      },
      body: JSON.stringify({ query: sql })
    });

    const text = await response.text();
    console.log('Response status:', response.status);

    if (response.ok) {
      console.log('✓ Migration completed successfully!\n');
      return;
    }
  } catch (e) {
    console.log('pg/query endpoint not available:', e.message);
  }

  // Try the SQL Editor API endpoint
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: sql })
    });

    if (response.ok) {
      console.log('✓ Migration completed!\n');
      return;
    }
  } catch (e) {
    // Continue to manual instructions
  }

  // If all else fails, provide manual instructions
  console.log('Automatic migration not available. Please run manually:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/loihxoyrutbzmqscdknk/sql/new');
  console.log('2. Paste and run this SQL:\n');
  console.log('========================================');
  console.log(sql);
  console.log('========================================\n');
}

runMigration().catch(console.error);
