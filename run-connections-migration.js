const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:jp3VGp02fXhSwgNI@db.loihxoyrutbzmqscdknk.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Connected. Running migrations...');

    // 1. Add code column to project_modules
    await client.query('ALTER TABLE project_modules ADD COLUMN IF NOT EXISTS code VARCHAR(10);');
    console.log('Added code column to project_modules');

    // 2. Add code column to module_features
    await client.query('ALTER TABLE module_features ADD COLUMN IF NOT EXISTS code VARCHAR(10);');
    console.log('Added code column to module_features');

    // 3. Create entity_connections table
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
    console.log('Created entity_connections table');

    // 4. Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_entity_connections_project ON entity_connections(project_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_entity_connections_source ON entity_connections(source_type, source_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_entity_connections_target ON entity_connections(target_type, target_id);');
    console.log('Created indexes');

    // 5. Enable RLS
    await client.query('ALTER TABLE entity_connections ENABLE ROW LEVEL SECURITY;');
    await client.query('DROP POLICY IF EXISTS "Allow all access to entity_connections" ON entity_connections;');
    await client.query('CREATE POLICY "Allow all access to entity_connections" ON entity_connections FOR ALL USING (true) WITH CHECK (true);');
    console.log('Enabled RLS');

    // 6. Generate codes for existing modules
    const { rows: projects } = await client.query('SELECT DISTINCT project_id FROM project_modules WHERE code IS NULL');
    for (const { project_id } of projects) {
      const { rows: maxCode } = await client.query(
        "SELECT MAX(CAST(SUBSTRING(code FROM 2) AS INTEGER)) as max_num FROM project_modules WHERE project_id = $1 AND code IS NOT NULL AND code LIKE 'M%'",
        [project_id]
      );
      let nextNum = (maxCode[0]?.max_num || 0) + 1;
      const { rows: modules } = await client.query(
        'SELECT id FROM project_modules WHERE project_id = $1 AND code IS NULL ORDER BY created_at ASC',
        [project_id]
      );
      for (const mod of modules) {
        await client.query('UPDATE project_modules SET code = $1 WHERE id = $2', [`M${nextNum++}`, mod.id]);
      }
    }
    console.log('Generated module codes');

    // 7. Generate codes for existing functions
    const { rows: projectsWithFeatures } = await client.query(`
      SELECT DISTINCT pm.project_id FROM module_features mf
      JOIN project_modules pm ON mf.module_id = pm.id
      WHERE mf.code IS NULL
    `);
    for (const { project_id } of projectsWithFeatures) {
      const { rows: maxCode } = await client.query(`
        SELECT MAX(CAST(SUBSTRING(mf.code FROM 2) AS INTEGER)) as max_num
        FROM module_features mf JOIN project_modules pm ON mf.module_id = pm.id
        WHERE pm.project_id = $1 AND mf.code IS NOT NULL AND mf.code LIKE 'F%'
      `, [project_id]);
      let nextNum = (maxCode[0]?.max_num || 0) + 1;
      const { rows: features } = await client.query(`
        SELECT mf.id FROM module_features mf
        JOIN project_modules pm ON mf.module_id = pm.id
        WHERE pm.project_id = $1 AND mf.code IS NULL
        ORDER BY mf.created_at ASC
      `, [project_id]);
      for (const feat of features) {
        await client.query('UPDATE module_features SET code = $1 WHERE id = $2', [`F${nextNum++}`, feat.id]);
      }
    }
    console.log('Generated function codes');

    console.log('Migration completed successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
