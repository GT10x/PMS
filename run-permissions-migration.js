const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:jp3VGp02fXhSwgNI@db.loihxoyrutbzmqscdknk.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Connected. Running permissions migration...');

    // 1. Create stakeholder_module_permissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS stakeholder_module_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        module_name VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(project_id, user_id, module_name)
      );
    `);
    console.log('Created stakeholder_module_permissions table');

    // 2. Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_smp_project ON stakeholder_module_permissions(project_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_smp_user ON stakeholder_module_permissions(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_smp_project_user ON stakeholder_module_permissions(project_id, user_id);');
    console.log('Created indexes');

    // 3. Enable RLS
    await client.query('ALTER TABLE stakeholder_module_permissions ENABLE ROW LEVEL SECURITY;');
    await client.query('DROP POLICY IF EXISTS "Allow all access to stakeholder_module_permissions" ON stakeholder_module_permissions;');
    await client.query('CREATE POLICY "Allow all access to stakeholder_module_permissions" ON stakeholder_module_permissions FOR ALL USING (true) WITH CHECK (true);');
    console.log('Enabled RLS');

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
