// Migration script using Supabase Admin client
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Starting migration...');
  console.log('Supabase URL:', supabaseUrl);

  try {
    // Step 1: Check if tables exist
    console.log('\n1. Checking if module_features table exists...');
    const { data: existingFeatures, error: checkError } = await supabase
      .from('module_features')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('   module_features table already exists!');

      // Count existing features
      const { count } = await supabase
        .from('module_features')
        .select('*', { count: 'exact', head: true });
      console.log(`   Found ${count || 0} existing features`);

      // Check feature_remarks
      const { data: existingRemarks, error: remarksCheckError } = await supabase
        .from('feature_remarks')
        .select('id')
        .limit(1);

      if (!remarksCheckError) {
        console.log('   feature_remarks table already exists!');
        const { count: remarksCount } = await supabase
          .from('feature_remarks')
          .select('*', { count: 'exact', head: true });
        console.log(`   Found ${remarksCount || 0} existing remarks`);
      }

      console.log('\n✓ Tables already exist. Migration may have been run before.');
      console.log('  If you need to migrate existing features from description column,');
      console.log('  please run the SQL manually in Supabase SQL Editor.');
      return;
    }

    console.log('   Table does not exist. Need to create tables via SQL Editor.');
    console.log('\n========================================');
    console.log('MANUAL MIGRATION REQUIRED');
    console.log('========================================');
    console.log('\nThe Supabase JavaScript client cannot create tables directly.');
    console.log('Please run the following SQL in Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/loihxoyrutbzmqscdknk/sql/new');
    console.log('\n--- COPY FROM HERE ---\n');

    console.log(`
-- Table 1: Individual features for each module
CREATE TABLE IF NOT EXISTS module_features (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES project_modules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_module_features_module_id ON module_features(module_id);
CREATE INDEX IF NOT EXISTS idx_module_features_sort_order ON module_features(module_id, sort_order);

-- Table 2: Remarks for each feature
CREATE TABLE IF NOT EXISTS feature_remarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_id UUID NOT NULL REFERENCES module_features(id) ON DELETE CASCADE,
  content TEXT,
  file_url TEXT,
  file_type VARCHAR(20) CHECK (file_type IN ('image', 'voice') OR file_type IS NULL),
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_remarks_feature_id ON feature_remarks(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_remarks_sort_order ON feature_remarks(feature_id, sort_order);

-- Grant permissions
GRANT ALL ON module_features TO authenticated;
GRANT ALL ON module_features TO anon;
GRANT ALL ON feature_remarks TO authenticated;
GRANT ALL ON feature_remarks TO anon;

-- Migrate existing features from description column
INSERT INTO module_features (module_id, name, sort_order, created_by, created_at)
SELECT
  m.id as module_id,
  TRIM(REGEXP_REPLACE(TRIM(line), '^[•\\-\\*\\d\\.]+\\s*', '')) as name,
  (row_number() OVER (PARTITION BY m.id ORDER BY ordinality)) - 1 as sort_order,
  m.created_by,
  NOW()
FROM project_modules m,
LATERAL unnest(string_to_array(m.description, E'\\n')) WITH ORDINALITY as t(line, ordinality)
WHERE m.description IS NOT NULL
  AND m.description != ''
  AND TRIM(line) != ''
  AND TRIM(REGEXP_REPLACE(TRIM(line), '^[•\\-\\*\\d\\.]+\\s*', '')) != ''
  AND NOT EXISTS (
    SELECT 1 FROM module_features mf WHERE mf.module_id = m.id
  );
`);

    console.log('\n--- END OF SQL ---\n');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

runMigration();
