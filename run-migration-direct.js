const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials in .env.local');
  console.log('URL:', supabaseUrl);
  console.log('Key exists:', !!supabaseKey);
  process.exit(1);
}

console.log('Connecting to Supabase...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('\n📖 Reading migration file...');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'supabase-migration.sql'),
      'utf8'
    );

    console.log('\n⚠️  IMPORTANT: You need to run this SQL manually in Supabase SQL Editor.');
    console.log('The anon key does not have permissions to execute DDL statements.\n');

    console.log('Steps to run migration:');
    console.log('1. Go to: https://supabase.com/dashboard/project/loihxoyrutbzmqscdknk/sql/new');
    console.log('2. Copy the SQL from: supabase-migration.sql');
    console.log('3. Paste and click "Run"\n');

    console.log('Alternatively, if you have the service role key, add it to .env.local:');
    console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key\n');

    // Try to create admin user if tables exist
    console.log('Attempting to create admin user...\n');

    const password = 'Admin@123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email: 'piush008@gmail.com',
          password_hash: passwordHash,
          full_name: 'Piush Thakker',
          role: 'admin',
          is_admin: true,
        },
      ])
      .select();

    if (error) {
      if (error.code === '42P01') {
        console.log('❌ Tables do not exist yet. Please run the migration SQL first.');
      } else if (error.code === '23505') {
        console.log('✅ Admin user already exists!');
        console.log('Email: piush008@gmail.com');
        console.log('Password: Admin@123');
      } else {
        console.log('❌ Error creating admin user:', error.message);
      }
    } else {
      console.log('✅ Admin user created successfully!');
      console.log('Email: piush008@gmail.com');
      console.log('Password: Admin@123');
      console.log('\n⚠️  IMPORTANT: Please change this password after first login!');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

runMigration();
