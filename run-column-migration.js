const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Supabase connection string
const connectionString = 'postgresql://postgres.loihxoyrutbzmqscdknk:Piush%402029@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

console.log('🔧 Running column migration on Supabase PostgreSQL...\n');

async function runMigration() {
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL\n');

    const sql = fs.readFileSync(
      path.join(__dirname, 'ADD-COLUMNS-TO-USER-PROFILES.sql'),
      'utf8'
    );

    // Execute the SQL
    console.log('📝 Executing migration SQL...\n');
    const result = await client.query(sql);

    console.log('✅ Migration executed successfully!\n');

    // Verify the user
    console.log('🔍 Verifying admin user...\n');
    const verifyResult = await client.query(`
      SELECT id, email, full_name, role, is_admin, username, created_at
      FROM user_profiles
      WHERE email = 'piush008@gmail.com'
    `);

    if (verifyResult.rows.length > 0) {
      const user = verifyResult.rows[0];
      console.log('✅ Admin user configured successfully!');
      console.log('\n📊 User Details:');
      console.log('   Email:', user.email);
      console.log('   Name:', user.full_name);
      console.log('   Role:', user.role);
      console.log('   Is Admin:', user.is_admin);
      console.log('   Username:', user.username);
      console.log('\n📝 Login Credentials:');
      console.log('   Email: piush008@gmail.com');
      console.log('   Password: Admin@123\n');
    }

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

runMigration();
