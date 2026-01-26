import { NextResponse } from 'next/server';
// @ts-ignore - pg types not needed for this endpoint
import { Client } from 'pg';

// IMPORTANT: This endpoint should be disabled after first use for security
const MIGRATION_ENABLED = true;

export async function GET() {
  if (!MIGRATION_ENABLED) {
    return NextResponse.json(
      { error: 'Migration endpoint disabled' },
      { status: 403 }
    );
  }

  try {
    // Try different connection methods (updated password)
    const connectionAttempts = [
      // Attempt 1: Using pooler with IPv6
      'postgresql://postgres.loihxoyrutbzmqscdknk:gftfql2VY29ijoY0@aws-0-ap-south-1.pooler.supabase.com:5432/postgres',
      // Attempt 2: Direct connection
      'postgresql://postgres:gftfql2VY29ijoY0@db.loihxoyrutbzmqscdknk.supabase.co:5432/postgres',
      // Attempt 3: Transaction pooler
      'postgresql://postgres.loihxoyrutbzmqscdknk:gftfql2VY29ijoY0@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
    ];

    let client: Client | null = null;
    let connectionError: any = null;

    for (const connString of connectionAttempts) {
      try {
        console.log('Trying connection...');
        client = new Client({
          connectionString: connString,
          ssl: { rejectUnauthorized: false }
        });

        await client.connect();
        console.log('Connected!');
        break;
      } catch (err: any) {
        connectionError = err;
        console.log('Connection failed:', err.message);
        client = null;
      }
    }

    if (!client) {
      return NextResponse.json({
        error: 'Could not connect to database',
        details: connectionError?.message,
        suggestion: 'Run the SQL manually in Supabase SQL Editor',
        sql: getMigrationSQL()
      }, { status: 500 });
    }

    const results: string[] = [];

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
    results.push('Created module_features table');

    // Step 2: Create indexes for module_features
    console.log('Creating indexes for module_features...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_module_features_module_id ON module_features(module_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_module_features_sort_order ON module_features(module_id, sort_order)`);
    results.push('Created indexes for module_features');

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
    results.push('Created feature_remarks table');

    // Step 4: Create indexes for feature_remarks
    console.log('Creating indexes for feature_remarks...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_feature_remarks_feature_id ON feature_remarks(feature_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_feature_remarks_sort_order ON feature_remarks(feature_id, sort_order)`);
    results.push('Created indexes for feature_remarks');

    // Step 5: Grant permissions
    console.log('Granting permissions...');
    await client.query(`GRANT ALL ON module_features TO authenticated`);
    await client.query(`GRANT ALL ON module_features TO anon`);
    await client.query(`GRANT ALL ON feature_remarks TO authenticated`);
    await client.query(`GRANT ALL ON feature_remarks TO anon`);
    results.push('Granted permissions');

    // Step 5.5: Add image_url and voice_url columns for multiple file support
    console.log('Adding image_url and voice_url columns...');
    await client.query(`ALTER TABLE feature_remarks ADD COLUMN IF NOT EXISTS image_url TEXT`);
    await client.query(`ALTER TABLE feature_remarks ADD COLUMN IF NOT EXISTS voice_url TEXT`);
    results.push('Added image_url and voice_url columns');

    // Step 5.6: Migrate existing file_url data to new columns
    console.log('Migrating existing file data...');
    const imageResult = await client.query(`
      UPDATE feature_remarks
      SET image_url = file_url
      WHERE file_type = 'image' AND file_url IS NOT NULL AND image_url IS NULL
    `);
    const voiceResult = await client.query(`
      UPDATE feature_remarks
      SET voice_url = file_url
      WHERE file_type = 'voice' AND file_url IS NOT NULL AND voice_url IS NULL
    `);
    results.push(`Migrated ${imageResult.rowCount} image and ${voiceResult.rowCount} voice records`);

    // Step 5.7: Add phase column to module_features
    console.log('Adding phase column to module_features...');
    await client.query(`ALTER TABLE module_features ADD COLUMN IF NOT EXISTS phase INTEGER DEFAULT 1`);
    results.push('Added phase column to module_features');

    // Step 6: Migrate existing features from description column
    console.log('Migrating existing features...');
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
    results.push(`Migrated ${migratedCount} features from existing modules`);

    await client.end();

    return NextResponse.json({
      success: true,
      message: 'Feature remarks migration completed successfully!',
      results
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      error: 'Migration failed',
      details: error.message,
      sql: getMigrationSQL()
    }, { status: 500 });
  }
}

function getMigrationSQL(): string {
  return `-- Run this SQL in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/loihxoyrutbzmqscdknk/sql/new

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

-- Indexes for module_features
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

-- Indexes for feature_remarks
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
  );`;
}
