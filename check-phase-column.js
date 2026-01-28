const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://loihxoyrutbzmqscdknk.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvaWh4b3lydXRiem1xc2Nka25rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODk0MywiZXhwIjoyMDc5ODE0OTQzfQ.qrCt9_vF9twekh9DWRlmICtjkuiCFbqdfuggXz4GYL8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPhase() {
  console.log('Checking if phase column exists in module_features...');

  const { data, error } = await supabase
    .from('module_features')
    .select('id, name, phase')
    .limit(5);

  if (error) {
    console.log('Error:', error.message);
    if (error.message.includes('phase')) {
      console.log('\n❌ phase column does NOT exist');
    }
  } else {
    console.log('✓ phase column EXISTS!');
    console.log('\nSample data:');
    data.forEach(f => {
      console.log(`  - ${f.name}: phase = ${f.phase}`);
    });
  }
}

checkPhase();
