const https = require('https');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: '.env.local' });

const projectRef = 'loihxoyrutbzmqscdknk';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

console.log('👤 Creating Admin User via Direct SQL...\n');

async function createAdmin() {
  try {
    // Generate password hash
    const password = 'Admin@123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    console.log('🔐 Password hash generated\n');

    // SQL to insert admin user
    const sql = `
INSERT INTO users (email, password_hash, full_name, role, is_admin, username)
VALUES (
  'piush008@gmail.com',
  '${passwordHash}',
  'Piush Thakker',
  'admin',
  true,
  'piush008'
)
ON CONFLICT (email) DO NOTHING
RETURNING *;
    `.trim();

    console.log('📝 Executing SQL via Supabase REST API...\n');

    const options = {
      hostname: `${projectRef}.supabase.co`,
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Prefer': 'return=representation'
      }
    };

    const data = JSON.stringify({
      sql: sql
    });

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        console.log('Status Code:', res.statusCode);

        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('✅ Admin user created successfully!\n');
          console.log('📝 Login Credentials:');
          console.log('   Email: piush008@gmail.com');
          console.log('   Password: Admin@123\n');
        } else {
          console.log('Response:', body);
          console.log('\n⚠️  SQL execution via REST API not available.');
          console.log('   This is expected for Supabase hosted projects.\n');

          // Try alternative method - test if we can query the users table
          testUserAccess();
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      testUserAccess();
    });

    req.write(data);
    req.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

function testUserAccess() {
  console.log('🔍 Testing user table access...\n');

  const https = require('https');

  const options = {
    hostname: `${projectRef}.supabase.co`,
    port: 443,
    path: '/rest/v1/users?select=email,full_name,role',
    method: 'GET',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    }
  };

  const req = https.request(options, (res) => {
    let body = '';

    res.on('data', (chunk) => {
      body += chunk;
    });

    res.on('end', () => {
      console.log('Users Table Query Status:', res.statusCode);
      console.log('Response:', body);

      if (res.statusCode === 200) {
        const users = JSON.parse(body);
        console.log(`\n✅ Found ${users.length} user(s) in database`);

        if (users.length > 0) {
          console.log('\nExisting users:');
          users.forEach(user => {
            console.log(`   - ${user.email} (${user.role})`);
          });
        }
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error:', error.message);
  });

  req.end();
}

createAdmin();
