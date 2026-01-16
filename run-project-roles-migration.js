const { Client } = require('pg');

async function runMigration() {
  const client = new Client({
    host: 'db.loihxoyrutbzmqscdknk.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'vNeNwnWYjbOH1rt4',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Add project_roles column
    await client.query(`
      ALTER TABLE project_members 
      ADD COLUMN IF NOT EXISTS project_roles text[] DEFAULT ARRAY[]::text[]
    `);
    console.log('Added project_roles column');

    await client.end();
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration error:', error.message);
    process.exit(1);
  }
}

runMigration();
