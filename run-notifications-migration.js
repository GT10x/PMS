require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function runMigration() {
  console.log('Running notifications migration...');

  // Create the user_project_reads table
  const { error: tableError } = await supabase.rpc('exec_sql', {
    sql: `
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
    `
  });

  if (tableError) {
    // Try direct approach - create via insert/select pattern
    console.log('RPC not available, trying alternative approach...');

    // Check if table exists by trying to select from it
    const { error: checkError } = await supabase
      .from('user_project_reads')
      .select('id')
      .limit(1);

    if (checkError && checkError.code === '42P01') {
      console.log('Table does not exist. Please run the SQL manually in Supabase dashboard.');
      console.log('\nSQL to run:');
      console.log(`
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

CREATE INDEX IF NOT EXISTS idx_user_project_reads_user ON user_project_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_project_reads_project ON user_project_reads(project_id);
      `);
      return;
    } else if (!checkError) {
      console.log('Table already exists!');
      return;
    }
  }

  console.log('Migration completed successfully!');
}

runMigration().catch(console.error);
