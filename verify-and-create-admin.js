const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

console.log('🔍 Verifying Database Setup...\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyAndCreateAdmin() {
  try {
    // Check all tables
    const tables = ['users', 'projects', 'modules', 'functionalities', 'tasks', 'sprints', 'comments', 'user_module_permissions'];

    console.log('📊 Checking tables...\n');

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('count', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: exists`);
      }
    }

    console.log('\n👤 Checking for admin user...\n');

    // Check if admin exists
    const { data: existingAdmin, error: adminCheckError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'piush008@gmail.com')
      .single();

    if (existingAdmin) {
      console.log('✅ Admin user already exists!');
      console.log('   Email:', existingAdmin.email);
      console.log('   Name:', existingAdmin.full_name);
      console.log('   Role:', existingAdmin.role);
      console.log('   Is Admin:', existingAdmin.is_admin);
      console.log('\n📝 Login Credentials:');
      console.log('   Email: piush008@gmail.com');
      console.log('   Password: Admin@123\n');
      return true;
    }

    console.log('⚠️  Admin user not found. Creating...\n');

    // Create admin user
    const password = 'Admin@123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const { data: newAdmin, error: createError } = await supabase
      .from('users')
      .insert([
        {
          email: 'piush008@gmail.com',
          password_hash: passwordHash,
          full_name: 'Piush Thakker',
          role: 'admin',
          is_admin: true,
          username: 'piush008'
        }
      ])
      .select()
      .single();

    if (createError) {
      console.log('❌ Error creating admin user:', createError.message);
      console.log('   Code:', createError.code);
      console.log('   Details:', createError.details);
      return false;
    }

    console.log('✅ Admin user created successfully!');
    console.log('   Email:', newAdmin.email);
    console.log('   Name:', newAdmin.full_name);
    console.log('\n📝 Login Credentials:');
    console.log('   Email: piush008@gmail.com');
    console.log('   Password: Admin@123\n');
    console.log('⚠️  IMPORTANT: Change this password after first login!\n');

    return true;

  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

verifyAndCreateAdmin();
