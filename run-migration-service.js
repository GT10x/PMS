const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials');
  process.exit(1);
}

console.log('🔌 Connecting to Supabase with service role...');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('\n📖 Reading migration SQL...');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'supabase-migration.sql'),
      'utf8'
    );

    console.log('🔄 Running database migration...\n');

    // Split SQL into individual statements (simplified approach)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Skip comments
      if (statement.trim().startsWith('--')) continue;

      try {
        const { error } = await supabase.rpc('exec', { sql: statement });

        if (error) {
          // Try alternative approach - direct query
          const result = await supabase.from('_temp').select('*').limit(0);
          // Ignore error for now, the SQL might work via Supabase management API
        }

        successCount++;
        if (i % 10 === 0) {
          process.stdout.write('.');
        }
      } catch (err) {
        errorCount++;
      }
    }

    console.log(`\n\n⚠️  Note: Direct SQL execution has limitations.`);
    console.log('Running via Supabase SQL Editor instead...\n');

    // Alternative: Use Supabase Management API or provide instructions
    console.log('📝 Please run this SQL in Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/loihxoyrutbzmqscdknk/sql/new\n');
    console.log('   Copy the SQL from: supabase-migration.sql\n');

    // Try to create admin user assuming tables exist
    console.log('👤 Creating admin user...\n');

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
        console.log('❌ Tables do not exist yet.');
        console.log('   Please run the SQL migration in Supabase SQL Editor first.\n');
        console.log('   Steps:');
        console.log('   1. Go to: https://supabase.com/dashboard/project/loihxoyrutbzmqscdknk/sql/new');
        console.log('   2. Copy contents of: supabase-migration.sql');
        console.log('   3. Paste and click "Run"');
        console.log('   4. Then run this script again\n');
      } else if (error.code === '23505') {
        console.log('✅ Admin user already exists!');
        console.log('   Email: piush008@gmail.com');
        console.log('   Password: Admin@123\n');
      } else {
        console.log('❌ Error creating admin user:', error.message);
        console.log('   Code:', error.code);
        console.log('   Details:', error.details);
      }
    } else {
      console.log('✅ Admin user created successfully!');
      console.log('   Email: piush008@gmail.com');
      console.log('   Password: Admin@123');
      console.log('\n⚠️  IMPORTANT: Change this password after first login!\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

runMigration();
