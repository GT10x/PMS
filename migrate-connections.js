const { Client } = require('pg');

async function migrateConnections() {
  const client = new Client({
    connectionString: 'postgresql://postgres:jp3VGp02fXhSwgNI@db.loihxoyrutbzmqscdknk.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // 1. Add code column to project_modules
    console.log('Adding code column to project_modules...');
    try {
      await client.query(`
        ALTER TABLE project_modules ADD COLUMN IF NOT EXISTS code VARCHAR(10);
      `);
      console.log('✓ code column added to project_modules');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('✓ code column already exists in project_modules');
      } else {
        throw e;
      }
    }

    // 2. Add code column to module_features
    console.log('\nAdding code column to module_features...');
    try {
      await client.query(`
        ALTER TABLE module_features ADD COLUMN IF NOT EXISTS code VARCHAR(10);
      `);
      console.log('✓ code column added to module_features');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('✓ code column already exists in module_features');
      } else {
        throw e;
      }
    }

    // 3. Create entity_connections table
    console.log('\nCreating entity_connections table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS entity_connections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('module', 'function')),
        source_id UUID NOT NULL,
        target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('module', 'function')),
        target_id UUID NOT NULL,
        created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(source_type, source_id, target_type, target_id)
      );
    `);
    console.log('✓ entity_connections table created');

    // 4. Create indexes
    console.log('\nCreating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_entity_connections_project ON entity_connections(project_id);
      CREATE INDEX IF NOT EXISTS idx_entity_connections_source ON entity_connections(source_type, source_id);
      CREATE INDEX IF NOT EXISTS idx_entity_connections_target ON entity_connections(target_type, target_id);
    `);
    console.log('✓ Indexes created');

    // 5. Enable RLS
    console.log('\nEnabling Row Level Security...');
    await client.query(`
      ALTER TABLE entity_connections ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Allow all access to entity_connections" ON entity_connections;
      CREATE POLICY "Allow all access to entity_connections" ON entity_connections
        FOR ALL USING (true) WITH CHECK (true);
    `);
    console.log('✓ RLS enabled');

    // 6. Enable realtime
    console.log('\nEnabling Realtime...');
    try {
      await client.query(`
        ALTER PUBLICATION supabase_realtime ADD TABLE entity_connections;
      `);
      console.log('✓ Realtime enabled for entity_connections');
    } catch (e) {
      if (e.message.includes('already member')) {
        console.log('✓ entity_connections already in realtime publication');
      } else {
        throw e;
      }
    }

    // 7. Generate codes for existing modules (per project)
    console.log('\nGenerating codes for existing modules...');
    const { rows: projects } = await client.query(`
      SELECT DISTINCT project_id FROM project_modules WHERE code IS NULL
    `);

    for (const { project_id } of projects) {
      const { rows: modules } = await client.query(`
        SELECT id FROM project_modules
        WHERE project_id = $1 AND code IS NULL
        ORDER BY created_at ASC
      `, [project_id]);

      for (let i = 0; i < modules.length; i++) {
        await client.query(`
          UPDATE project_modules SET code = $1 WHERE id = $2
        `, [`M${i + 1}`, modules[i].id]);
      }
      console.log(`  Updated ${modules.length} modules in project ${project_id}`);
    }

    // 8. Generate codes for existing functions (global per project)
    console.log('\nGenerating codes for existing functions...');
    const { rows: projectsWithFeatures } = await client.query(`
      SELECT DISTINCT pm.project_id
      FROM module_features mf
      JOIN project_modules pm ON mf.module_id = pm.id
      WHERE mf.code IS NULL
    `);

    for (const { project_id } of projectsWithFeatures) {
      const { rows: features } = await client.query(`
        SELECT mf.id FROM module_features mf
        JOIN project_modules pm ON mf.module_id = pm.id
        WHERE pm.project_id = $1 AND mf.code IS NULL
        ORDER BY mf.created_at ASC
      `, [project_id]);

      for (let i = 0; i < features.length; i++) {
        await client.query(`
          UPDATE module_features SET code = $1 WHERE id = $2
        `, [`F${i + 1}`, features[i].id]);
      }
      console.log(`  Updated ${features.length} functions in project ${project_id}`);
    }

    // Verify
    const { rows: moduleCodes } = await client.query(`
      SELECT code, name FROM project_modules WHERE code IS NOT NULL LIMIT 5
    `);
    console.log('\nSample module codes:', moduleCodes);

    const { rows: featureCodes } = await client.query(`
      SELECT code, name FROM module_features WHERE code IS NOT NULL LIMIT 5
    `);
    console.log('Sample function codes:', featureCodes);

    console.log('\n✓ Migration complete!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

migrateConnections();
