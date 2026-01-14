const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://loihxoyrutbzmqscdknk.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvaWh4b3lydXRiem1xc2Nka25rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODk0MywiZXhwIjoyMDc5ODE0OTQzfQ.qrCt9_vF9twekh9DWRlmICtjkuiCFbqdfuggXz4GYL8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTable() {
  // Use rpc to execute raw SQL
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS push_tokens (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        device_type TEXT DEFAULT 'android',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
    `
  });

  if (error) {
    console.log('RPC not available, trying alternative method...');

    // Try to check if table exists by selecting from it
    const { error: selectError } = await supabase
      .from('push_tokens')
      .select('id')
      .limit(1);

    if (selectError && selectError.message.includes('does not exist')) {
      console.log('Table does not exist. Please run the SQL manually in Supabase SQL Editor.');
      console.log('Or the table might need to be created via Supabase Dashboard.');
      return false;
    } else if (!selectError) {
      console.log('Table already exists!');
      return true;
    }
  }

  console.log('Migration completed successfully!');
  return true;
}

createTable();
