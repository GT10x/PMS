const { Client } = require('pg')
const fs = require('fs')

// Supabase connection details
const connectionString = 'postgresql://postgres:8OwfFdq4ZRZZwRut@db.loihxoyrutbzmqscdknk.supabase.co:5432/postgres'

async function runMigration() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('Connecting to Supabase PostgreSQL...')
    await client.connect()
    console.log('✓ Connected successfully!\n')

    // Read the migration SQL file
    const migrationSQL = fs.readFileSync('./supabase-migration.sql', 'utf8')

    console.log('Executing migration SQL...')
    await client.query(migrationSQL)

    console.log('\n✓✓✓ Migration completed successfully! ✓✓✓\n')
    console.log('Database tables created:')
    console.log('  - user_profiles')
    console.log('  - projects')
    console.log('  - tasks')
    console.log('  - comments')
    console.log('  - project_members')
    console.log('\nYou can now sign up on your app!')

  } catch (error) {
    console.error('Migration error:', error.message)
    console.error('\nFull error:', error)
  } finally {
    await client.end()
  }
}

runMigration().catch(console.error)
