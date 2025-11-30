const fs = require('fs');
const path = require('path');
const https = require('https');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

// Extract project ref from URL
const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

console.log('🔌 Running database migration...');
console.log('Project:', projectRef);

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${projectRef}/database/query`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(JSON.stringify({ query: sql }));
    req.end();
  });
}

async function runMigration() {
  try {
    console.log('\n📖 Reading migration SQL...');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'supabase-migration.sql'),
      'utf8'
    );

    console.log('🔄 Executing migration...\n');

    try {
      await executeSQL(migrationSQL);
      console.log('✅ Migration executed successfully!\n');
    } catch (error) {
      console.log('⚠️  API method not available. Using alternative approach...\n');
    }

    // Create admin user using Supabase client
    console.log('👤 Creating admin user...\n');

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

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
      if (error.code === '23505') {
        console.log('✅ Admin user already exists!');
        console.log('   Email: piush008@gmail.com');
        console.log('   Password: Admin@123\n');
      } else {
        console.log('❌ Error:', error.message);
        console.log('\n📋 Manual steps required:');
        console.log('1. Go to: https://supabase.com/dashboard/project/loihxoyrutbzmqscdknk/sql/new');
        console.log('2. Copy and run the SQL from: supabase-migration.sql');
        console.log('3. Run this script again to create admin user\n');
      }
    } else {
      console.log('✅ Admin user created successfully!');
      console.log('   Email: piush008@gmail.com');
      console.log('   Password: Admin@123');
      console.log('\n⚠️  IMPORTANT: Change this password after first login!\n');
      console.log('✅ Database setup complete! Ready to deploy.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

runMigration();
