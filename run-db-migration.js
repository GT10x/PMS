const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

console.log('🚀 Starting Database Migration...\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQLStatements() {
  try {
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'supabase-migration-final.sql'),
      'utf8'
    );

    console.log('📖 Migration SQL loaded\n');
    console.log('🔧 Executing SQL statements via Supabase client...\n');

    // Split into individual statements and execute them one by one
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip empty statements and comments
      if (!statement || statement.startsWith('--')) continue;

      try {
        // Use Supabase client to execute raw SQL
        const { data, error } = await supabase.rpc('exec', { sql: statement });

        if (error) {
          console.log(`⚠️  Statement ${i + 1}: ${error.message}`);
          errorCount++;
        } else {
          successCount++;
          if (i % 20 === 0) {
            process.stdout.write('.');
          }
        }
      } catch (err) {
        errorCount++;
      }
    }

    console.log(`\n\n📊 Execution Summary:`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}\n`);

    // Now verify by checking if tables exist
    console.log('🔍 Verifying tables...\n');

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count');

    if (usersError && usersError.code === 'PGRST116') {
      console.log('❌ Tables verification failed - they may not exist yet\n');
      console.log('⚠️  Supabase client cannot execute DDL statements directly.\n');
      console.log('📝 MANUAL STEP REQUIRED:\n');
      console.log('   1. Go to: https://supabase.com/dashboard/project/loihxoyrutbzmqscdknk/sql/new');
      console.log('   2. Copy the contents of: supabase-migration-final.sql');
      console.log('   3. Paste into SQL Editor and click "Run"\n');
      return false;
    } else {
      console.log('✅ Tables exist and are accessible!\n');

      // Check for admin user
      const { data: adminUser, error: adminError } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'piush008@gmail.com')
        .single();

      if (adminUser) {
        console.log('✅ Admin user found!');
        console.log('   Email: piush008@gmail.com');
        console.log('   Password: Admin@123\n');
      } else {
        console.log('⚠️  Admin user not found, but table exists\n');
      }

      return true;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

executeSQLStatements();
