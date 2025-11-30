const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('Reading migration file...');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'supabase-migration.sql'),
      'utf8'
    );

    console.log('Running migration...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('Migration failed:', error);
      console.log('\n⚠️  Please run this SQL manually in your Supabase SQL Editor:');
      console.log('1. Go to https://supabase.com/dashboard/project/_/sql');
      console.log('2. Copy the contents of supabase-migration.sql');
      console.log('3. Paste and run it in the SQL Editor\n');
      process.exit(1);
    }

    console.log('✅ Migration completed successfully!');
    console.log('Data:', data);
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\n⚠️  Please run the migration manually in Supabase SQL Editor:');
    console.log('1. Go to https://supabase.com/dashboard/project/_/sql');
    console.log('2. Copy the contents of supabase-migration.sql');
    console.log('3. Paste and run it in the SQL Editor\n');
  }
}

runMigration();
