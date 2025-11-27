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
    const migrationSQL = fs.readFileSync('./add-modules-migration.sql', 'utf8')

    console.log('Executing modules migration SQL...')
    await client.query(migrationSQL)

    console.log('\n✓✓✓ Modules Migration completed successfully! ✓✓✓\n')
    console.log('Database tables created:')
    console.log('  - modules')
    console.log('  - sub_functions')
    console.log('\nYou can now add modules and sub-functions!')

  } catch (error) {
    console.error('Migration error:', error.message)
    console.error('\nFull error:', error)
  } finally {
    await client.end()
  }
}

runMigration().catch(console.error)
