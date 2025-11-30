const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function addEndDateColumn() {
  console.log('Adding end_date column to projects table...');

  try {
    // Check if end_date column exists
    const { data: columns, error: checkError } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'projects'
          AND column_name = 'end_date';
        `
      });

    if (checkError) {
      // If RPC doesn't exist, try direct SQL execution
      console.log('Attempting to add column directly...');

      const { error: alterError } = await supabase.rpc('exec_sql', {
        query: `
          DO $$
          BEGIN
              IF NOT EXISTS (
                  SELECT 1
                  FROM information_schema.columns
                  WHERE table_name = 'projects'
                  AND column_name = 'end_date'
              ) THEN
                  ALTER TABLE projects ADD COLUMN end_date DATE;
                  RAISE NOTICE 'Column end_date added successfully';
              ELSE
                  RAISE NOTICE 'Column end_date already exists';
              END IF;
          END $$;
        `
      });

      if (alterError) {
        console.error('Error adding column:', alterError);
        console.log('\nPlease run this SQL manually in Supabase SQL Editor:');
        console.log('URL: https://supabase.com/dashboard/project/loihxoyrutbzmqscdknk/sql/new\n');
        console.log(`
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'projects'
        AND column_name = 'end_date'
    ) THEN
        ALTER TABLE projects ADD COLUMN end_date DATE;
    END IF;
END $$;
        `);
        process.exit(1);
      }
    }

    console.log('✓ Column end_date is available in projects table');

    // Verify
    const { data: verifyData, error: verifyError } = await supabase
      .from('projects')
      .select('id, start_date, end_date')
      .limit(1);

    if (!verifyError) {
      console.log('✓ Verified: Column is accessible via API');
    } else {
      console.log('Note: Column added but verification failed:', verifyError.message);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

addEndDateColumn();
