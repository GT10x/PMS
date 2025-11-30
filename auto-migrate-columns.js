const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

console.log('🚀 Attempting automatic migration via Supabase client...\n');

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

async function tryUpdateUser() {
  try {
    // Generate password hash
    const password = 'Admin@123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    console.log('🔐 Password hash generated');
    console.log('📝 Attempting to update user (columns may already exist)...\n');

    // Try to update with all fields (some may fail if columns don't exist yet)
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        password_hash: passwordHash,
        is_admin: true,
        full_name: 'Piush Thakker',
        role: 'admin',
        username: 'piush008'
      })
      .eq('email', 'piush008@gmail.com')
      .select();

    if (error) {
      console.log('⚠️  Update failed (expected if columns don\'t exist):', error.message);
      console.log('\n📋 The columns need to be added to the database first.\n');
      console.log('🔧 I will create an API endpoint to do this for you...\n');
      return false;
    }

    if (data && data.length > 0) {
      console.log('✅ User updated successfully!');
      console.log('\n📊 Updated User:');
      console.log(JSON.stringify(data[0], null, 2));
      console.log('\n📝 Login Credentials:');
      console.log('   Email: piush008@gmail.com');
      console.log('   Password: Admin@123\n');
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

tryUpdateUser();
