const { Client } = require('pg');

async function runMigration() {
  // Try multiple passwords
  const passwords = ['Y3v483XPFW2pgXpo', 'gftfql2VY29ijoY0', 'jp3VGp02fXhSwgNI'];
  const connectionAttempts = [];

  for (const pwd of passwords) {
    connectionAttempts.push(
      `postgresql://postgres:${pwd}@db.loihxoyrutbzmqscdknk.supabase.co:5432/postgres`
    );
  }

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
    // Add sort_order column to project_modules if it doesn't exist
    console.log('Adding sort_order column to project_modules...');
    await client.query(`
      ALTER TABLE project_modules
      ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0
    `);
    console.log('✓ Added sort_order column');

    // Create index for efficient ordering
    console.log('Creating index for sort_order...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_project_modules_sort_order
      ON project_modules(project_id, sort_order)
    `);
    console.log('✓ Created index');

    // Initialize sort_order based on existing created_at order
    console.log('Initializing sort_order values...');
    await client.query(`
      WITH ordered_modules AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) - 1 as new_order
        FROM project_modules
        WHERE sort_order IS NULL OR sort_order = 0
      )
      UPDATE project_modules m
      SET sort_order = o.new_order
      FROM ordered_modules o
      WHERE m.id = o.id
    `);
    console.log('✓ Initialized sort_order values');

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
