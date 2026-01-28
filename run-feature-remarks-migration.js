const { Client } = require('pg');

async function runMigration() {
  const connectionAttempts = [
    'postgresql://postgres.loihxoyrutbzmqscdknk:gftfql2VY29ijoY0@aws-0-ap-south-1.pooler.supabase.com:5432/postgres',
    'postgresql://postgres:gftfql2VY29ijoY0@db.loihxoyrutbzmqscdknk.supabase.co:5432/postgres',
    'postgresql://postgres.loihxoyrutbzmqscdknk:gftfql2VY29ijoY0@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ];

  let client = null;

  for (const connString of connectionAttempts) {
    try {
      console.log('Trying connection...');
      client = new Client({
        connectionString: connString,
        ssl: { rejectUnauthorized: false }
      });
      await client.connect();
      console.log('Connected successfully!');
      break;
    } catch (err) {
      console.log('Connection failed:', err.message);
      client = null;
    }
  }

  if (!client) {
    console.error('Could not connect to database');
    process.exit(1);
  }

  try {
    // Step 1: Create module_features table
    console.log('Creating module_features table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS module_features (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        module_id UUID NOT NULL REFERENCES project_modules(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_by UUID REFERENCES user_profiles(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✓ Created module_features table');

    // Step 2: Create indexes for module_features
    console.log('Creating indexes for module_features...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_module_features_module_id ON module_features(module_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_module_features_sort_order ON module_features(module_id, sort_order)`);
    console.log('✓ Created indexes for module_features');

    // Step 3: Create feature_remarks table
    console.log('Creating feature_remarks table...');
    await client.query(`
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
      )
    `);
    console.log('✓ Created feature_remarks table');

    // Step 4: Create indexes for feature_remarks
    console.log('Creating indexes for feature_remarks...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_feature_remarks_feature_id ON feature_remarks(feature_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_feature_remarks_sort_order ON feature_remarks(feature_id, sort_order)`);
    console.log('✓ Created indexes for feature_remarks');

    // Step 5: Grant permissions
    console.log('Granting permissions...');
    try {
      await client.query(`GRANT ALL ON module_features TO authenticated`);
      await client.query(`GRANT ALL ON module_features TO anon`);
      await client.query(`GRANT ALL ON feature_remarks TO authenticated`);
      await client.query(`GRANT ALL ON feature_remarks TO anon`);
      console.log('✓ Granted permissions');
    } catch (e) {
      console.log('Note: Permission grants may have failed (common in pooler connections)');
    }

    // Step 6: Migrate existing features from description column
    console.log('Migrating existing features from description column...');
    const migrationResult = await client.query(`
      WITH inserted_features AS (
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
          )
        RETURNING id
      )
      SELECT COUNT(*) as migrated_count FROM inserted_features
    `);

    const migratedCount = migrationResult.rows[0]?.migrated_count || 0;
    console.log(`✓ Migrated ${migratedCount} features from existing modules`);

    console.log('\n========================================');
    console.log('Migration completed successfully!');
    console.log('========================================');

  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    await client.end();
  }
}

runMigration();
