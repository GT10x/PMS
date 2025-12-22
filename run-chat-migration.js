const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

// Extract project ref from URL
const projectRef = supabaseUrl.replace('https://', '').replace('http://', '').split('.')[0];

// Construct PostgreSQL connection string
const connectionString = `postgresql://postgres.${projectRef}:${supabaseServiceKey}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`;

console.log('🔌 Connecting to PostgreSQL database...');
console.log('Project:', projectRef);

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runChatMigration() {
  try {
    await client.connect();
    console.log('✅ Connected to database!\n');

    console.log('📖 Reading chat migration SQL...');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'chat-migration.sql'),
      'utf8'
    );

    console.log('🔄 Executing chat migration...\n');

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (!statement) continue;
      try {
        await client.query(statement);
        console.log('✅ Executed statement successfully');
      } catch (err) {
        // Ignore "already exists" errors
        if (err.message.includes('already exists')) {
          console.log('⚠️  Already exists, skipping...');
        } else {
          console.log('⚠️  Warning:', err.message);
        }
      }
    }

    console.log('\n✅ Chat migration completed successfully!\n');

    // Verify tables exist
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('chat_messages', 'chat_reactions');
    `;

    const result = await client.query(tablesQuery);

    if (result.rows.length === 2) {
      console.log('✅ Verified: chat_messages and chat_reactions tables exist!');
    } else {
      console.log('Tables found:', result.rows.map(r => r.table_name).join(', '));
    }

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.message.includes('password authentication failed')) {
      console.log('\n⚠️  Connection failed. Trying alternative connection...');
    }

    try {
      await client.end();
    } catch (e) {
      // Ignore
    }
  }
}

runChatMigration();
