const https = require('https');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: '.env.local' });

const projectRef = 'loihxoyrutbzmqscdknk';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

console.log('👤 Updating user_profiles to add admin access...\n');

async function updateUserProfile() {
  try {
    // Generate password hash for Admin@123
    const password = 'Admin@123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    console.log('🔐 Password hash generated');
    console.log('📝 Updating user via REST API...\n');

    // Update the existing user
    const updateData = JSON.stringify({
      password_hash: passwordHash,
      is_admin: true,
      full_name: 'Piush Thakker',
      role: 'admin',
      username: 'piush008'
    });

    const options = {
      hostname: `${projectRef}.supabase.co`,
      port: 443,
      path: '/rest/v1/user_profiles?email=eq.piush008@gmail.com',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(updateData),
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response:', body);

        if (res.statusCode === 200) {
          console.log('\n✅ User updated successfully!');
          console.log('\n📝 Login Credentials:');
          console.log('   Email: piush008@gmail.com');
          console.log('   Password: Admin@123\n');
        } else if (res.statusCode === 404) {
          console.log('\n⚠️  Column may not exist. Let me check what columns exist...\n');
          checkUserProfile();
        } else {
          console.log('\n⚠️  Update may have failed. Checking user profile...\n');
          checkUserProfile();
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
    });

    req.write(updateData);
    req.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

function checkUserProfile() {
  const options = {
    hostname: `${projectRef}.supabase.co`,
    port: 443,
    path: '/rest/v1/user_profiles?email=eq.piush008@gmail.com&select=*',
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
      console.log('Current User Profile:');
      console.log(body);
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error:', error.message);
  });

  req.end();
}

updateUserProfile();
