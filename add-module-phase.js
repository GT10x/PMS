const { Client } = require('pg');

async function runMigration() {
  const client = new Client({
    connectionString: 'postgresql://postgres:jp3VGp02fXhSwgNI@db.loihxoyrutbzmqscdknk.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected!');

    console.log('Adding phase column to project_modules...');
    await client.query(`
      ALTER TABLE project_modules
      ADD COLUMN IF NOT EXISTS phase INTEGER DEFAULT 1
    `);
    console.log('✓ Added phase column');

    console.log('\n========================================');
    console.log('Migration completed!');
    console.log('========================================');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

runMigration();
