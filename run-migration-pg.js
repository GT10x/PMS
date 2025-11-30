const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

// Extract project ref from URL
const projectRef = supabaseUrl.replace('https://', '').replace('http://', '').split('.')[0];

// Construct PostgreSQL connection string
// Supabase format: postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
const connectionString = `postgresql://postgres.${projectRef}:${supabaseServiceKey}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`;

console.log('🔌 Connecting to PostgreSQL database...');
console.log('Project:', projectRef);

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  try {
    await client.connect();
    console.log('✅ Connected to database!\n');

    console.log('📖 Reading migration SQL...');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'supabase-migration.sql'),
      'utf8'
    );

    console.log('🔄 Executing migration...\n');

    await client.query(migrationSQL);

    console.log('✅ Database migration completed successfully!\n');

    // Create admin user
    console.log('👤 Creating admin user...\n');

    const password = 'Admin@123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const insertQuery = `
      INSERT INTO users (email, password_hash, full_name, role, is_admin)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email, full_name, role, is_admin;
    `;

    const result = await client.query(insertQuery, [
      'piush008@gmail.com',
      passwordHash,
      'Piush Thakker',
      'admin',
      true
    ]);

    if (result.rows.length > 0) {
      console.log('✅ Admin user created successfully!');
      console.log('   Email: piush008@gmail.com');
      console.log('   Password: Admin@123');
      console.log('\n⚠️  IMPORTANT: Change this password after first login!\n');
    } else {
      console.log('ℹ️  Admin user already exists');
      console.log('   Email: piush008@gmail.com');
      console.log('   Password: Admin@123\n');
    }

    console.log('✅ Database setup complete! Ready to deploy.\n');

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);

    if (error.message.includes('password authentication failed')) {
      console.log('\n⚠️  Connection failed. The service role key might not be the database password.');
      console.log('Please check your Supabase database password in the dashboard.\n');
    }

    try {
      await client.end();
    } catch (e) {
      // Ignore
    }
  }
}

runMigration();
