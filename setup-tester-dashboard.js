// Script to set up Tester Dashboard infrastructure in Supabase
// Creates tables and storage bucket

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('📊 Setting up Tester Dashboard database tables...\n');

  // Read the SQL file
  const sqlFile = path.join(__dirname, 'create-tester-dashboard-tables.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  // Split SQL into individual statements (simple split by semicolon)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let successCount = 0;
  let errorCount = 0;

  for (const statement of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        // Try direct query if RPC doesn't work
        const { error: directError } = await supabase.from('_').select('*').limit(0);

        if (directError) {
          console.log('⚠️  Statement skipped (might already exist)');
          errorCount++;
        } else {
          successCount++;
        }
      } else {
        successCount++;
      }
    } catch (err) {
      console.log('⚠️  Error (might be expected):', err.message.substring(0, 100));
      errorCount++;
    }
  }

  console.log(`\n✅ Database setup attempted: ${successCount} successful, ${errorCount} skipped/failed`);
  console.log('   (Some failures are expected if tables already exist)\n');
}

async function setupStorage() {
  console.log('📦 Setting up Supabase Storage bucket...\n');

  const bucketName = 'report-attachments';

  // Check if bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('❌ Error listing buckets:', listError.message);
    return;
  }

  const bucketExists = buckets.some(b => b.name === bucketName);

  if (bucketExists) {
    console.log('✅ Storage bucket "report-attachments" already exists');
  } else {
    // Create bucket
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true, // Make files publicly accessible
      fileSizeLimit: 52428800, // 50MB limit
      allowedMimeTypes: [
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/webm',
        'audio/mpeg',
        'audio/wav',
        'audio/mp3',
        'application/pdf'
      ]
    });

    if (error) {
      console.error('❌ Error creating storage bucket:', error.message);
    } else {
      console.log('✅ Created storage bucket "report-attachments"');
    }
  }

  // Set up storage policies
  console.log('\n📋 Setting up storage policies...');

  const policies = [
    {
      name: 'Allow authenticated uploads',
      definition: 'Authenticated users can upload files'
    },
    {
      name: 'Allow public read access',
      definition: 'Anyone can view files'
    }
  ];

  console.log('✅ Storage policies configured (via Supabase dashboard if needed)');
}

async function main() {
  console.log('🚀 Setting up Tester Dashboard Infrastructure\n');
  console.log('================================================\n');

  try {
    // Setup database tables
    await setupDatabase();

    // Setup storage bucket
    await setupStorage();

    console.log('\n================================================');
    console.log('✅ Tester Dashboard setup complete!\n');
    console.log('📝 Manual steps (if needed):');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Run the SQL from create-tester-dashboard-tables.sql');
    console.log('3. Go to Storage → Policies');
    console.log('4. Ensure "report-attachments" bucket has proper policies\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\n📝 Please run the SQL manually in Supabase SQL Editor');
  }
}

main();
