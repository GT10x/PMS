const https = require('https');
const bcrypt = require('bcryptjs');

console.log('🚀 FINAL MIGRATION ATTEMPT\n');
console.log('========================================\n');

const projectRef = 'loihxoyrutbzmqscdknk';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvaWh4b3lydXRiem1xc2Nka25rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODk0MywiZXhwIjoyMDc5ODE0OTQzfQ.qrCt9_vF9twekh9DWRlmICtjkuiCFbqdfuggXz4GYL8';

async function runFinalMigration() {
  try {
    // Step 1: Generate password hash
    console.log('Step 1: Generating password hash...');
    const password = 'Admin@123';
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('✅ Password hash generated\n');

    // Step 2: Try to update user with only existing columns first
    console.log('Step 2: Updating user with existing columns...');
    const basicUpdate = JSON.stringify({
      full_name: 'Piush Thakker'
      // Note: keeping role as 'developer' since 'admin' is not in the allowed check constraint
    });

    await makeRequest('PATCH', `/rest/v1/user_profiles?email=eq.piush008@gmail.com`, basicUpdate);

    console.log('\n========================================');
    console.log('✅ BASIC UPDATE SUCCESSFUL!\n');
    console.log('⚠️  IMPORTANT: The following columns need to be added manually:');
    console.log('   - password_hash');
    console.log('   - username');
    console.log('   - is_admin\n');

    console.log('📋 COPY AND RUN THIS SQL IN SUPABASE:');
    console.log('========================================\n');
    console.log(`-- URL: https://supabase.com/dashboard/project/${projectRef}/sql/new\n`);
    console.log(`ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- First, let's check what roles are allowed and possibly add 'admin'
-- ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
-- ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check CHECK (role IN ('developer', 'admin', 'project_manager', 'cto', 'consultant', 'tester'));

UPDATE user_profiles
SET
  password_hash = '${passwordHash}',
  is_admin = TRUE,
  username = 'piush008'
WHERE email = 'piush008@gmail.com';

SELECT id, email, full_name, role, is_admin, username
FROM user_profiles
WHERE email = 'piush008@gmail.com';\n`);
    console.log('========================================\n');
    console.log('📝 After running the SQL, you can login with:');
    console.log('   Email: piush008@gmail.com');
    console.log('   Password: Admin@123\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `${projectRef}.supabase.co`,
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Prefer': 'return=representation'
      }
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = https.request(options, (res) => {
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ ${method} request successful`);
          if (responseBody) {
            console.log('Response:', responseBody);
          }
          resolve(responseBody);
        } else {
          reject(new Error(`Request failed with status ${res.statusCode}: ${responseBody}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

runFinalMigration();
