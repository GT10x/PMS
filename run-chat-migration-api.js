const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

// Extract project ref from URL
const projectRef = supabaseUrl.replace('https://', '').replace('http://', '').split('.')[0];

console.log('🚀 Running Chat Migration via Supabase...');
console.log('Project:', projectRef);

async function runMigration() {
  try {
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'chat-migration.sql'),
      'utf8'
    );

    // Split into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`\n📝 Found ${statements.length} SQL statements to execute\n`);

    // Try to use the Supabase Query API (beta feature)
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    });

    console.log('API Status:', response.status);

    // Check if tables already exist by trying to query them
    const checkMessages = await fetch(`${supabaseUrl}/rest/v1/chat_messages?select=count&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    });

    if (checkMessages.status === 200) {
      console.log('✅ chat_messages table already exists!');
    } else if (checkMessages.status === 404) {
      console.log('❌ chat_messages table does not exist');
      console.log('\n⚠️  Supabase REST API cannot create tables directly.');
      console.log('📝 You need to run the SQL manually in Supabase Dashboard.\n');
      console.log('Steps:');
      console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
      console.log('2. Copy the contents of: chat-migration.sql');
      console.log('3. Paste into SQL Editor and click "Run"\n');

      // Let me try one more thing - creating a simpler version using REST API
      console.log('Attempting alternative approach...\n');

      // This won't work for CREATE TABLE but let's see the error
      const createTableResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      const result = await createTableResponse.text();
      console.log('RPC Response:', result);

      return false;
    } else {
      const errorText = await checkMessages.text();
      console.log('Check status:', checkMessages.status, errorText);
    }

    // Check reactions table
    const checkReactions = await fetch(`${supabaseUrl}/rest/v1/chat_reactions?select=count&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    });

    if (checkReactions.status === 200) {
      console.log('✅ chat_reactions table already exists!');
    } else {
      console.log('❌ chat_reactions table does not exist');
    }

    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

runMigration();
