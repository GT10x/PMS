// Check if sort_order column exists using Supabase client
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://loihxoyrutbzmqscdknk.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvaWh4b3lydXRiem1xc2Nka25rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODk0MywiZXhwIjoyMDc5ODE0OTQzfQ.qrCt9_vF9twekh9DWRlmICtjkuiCFbqdfuggXz4GYL8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSortOrder() {
  console.log('Checking if sort_order column exists in project_modules...');

  try {
    // Try to select with sort_order
    const { data, error } = await supabase
      .from('project_modules')
      .select('id, name, sort_order')
      .limit(3);

    if (error) {
      console.log('Error:', error.message);
      if (error.message.includes('sort_order')) {
        console.log('\n❌ sort_order column does NOT exist');
        console.log('\nPlease run this SQL in Supabase SQL Editor:');
        console.log('https://supabase.com/dashboard/project/loihxoyrutbzmqscdknk/sql/new');
        console.log('\n--- COPY THIS SQL ---\n');
        console.log(`ALTER TABLE project_modules ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_project_modules_sort_order ON project_modules(project_id, sort_order);

-- Initialize sort_order based on created_at
WITH ordered_modules AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) - 1 as new_order
  FROM project_modules
)
UPDATE project_modules m
SET sort_order = o.new_order
FROM ordered_modules o
WHERE m.id = o.id;`);
        console.log('\n--- END SQL ---');
      }
    } else {
      console.log('✓ sort_order column EXISTS!');
      console.log('\nSample data:');
      data.forEach(m => {
        console.log(`  - ${m.name}: sort_order = ${m.sort_order}`);
      });
    }
  } catch (err) {
    console.error('Unexpected error:', err.message);
  }
}

checkSortOrder();
