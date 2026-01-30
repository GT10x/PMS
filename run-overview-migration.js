const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:jp3VGp02fXhSwgNI@db.loihxoyrutbzmqscdknk.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Connected. Running migration...');

    await client.query('ALTER TABLE project_modules ADD COLUMN IF NOT EXISTS overview TEXT;');
    console.log('Added overview column to project_modules');

    // Verify
    const { rows } = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'project_modules' AND column_name = 'overview';
    `);

    if (rows.length > 0) {
      console.log('Verified: overview column exists -', rows[0].data_type);
    }

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
