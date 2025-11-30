const https = require('https');
const fs = require('fs');
const path = require('path');

// Read the migration SQL
const migrationSQL = fs.readFileSync(
  path.join(__dirname, 'supabase-migration-final.sql'),
  'utf8'
);

// Supabase Management API endpoint
const projectRef = 'loihxoyrutbzmqscdknk';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvaWh4b3lydXRiem1xc2Nka25rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODk0MywiZXhwIjoyMDc5ODE0OTQzfQ.qrCt9_vF9twekh9DWRlmICtjkuiCFbqdfuggXz4GYL8';

console.log('🚀 Attempting to execute migration SQL via Supabase...\n');
console.log('📄 Migration file: supabase-migration-final.sql\n');

const options = {
  hostname: `${projectRef}.supabase.co`,
  port: 443,
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Prefer': 'return=minimal'
  }
};

const data = JSON.stringify({
  query: migrationSQL
});

const req = https.request(options, (res) => {
  let body = '';

  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', body);

    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('\n✅ Migration executed successfully!');
    } else {
      console.log('\n❌ Migration failed.');
      console.log('\n📝 Please execute the SQL manually:');
      console.log('1. Go to: https://supabase.com/dashboard/project/loihxoyrutbzmqscdknk/sql/new');
      console.log('2. Copy the contents of: supabase-migration-final.sql');
      console.log('3. Paste and click "Run"');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  console.log('\n📝 Please execute the SQL manually in Supabase SQL Editor');
});

req.write(data);
req.end();
