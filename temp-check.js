const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://loihxoyrutbzmqscdknk.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvaWh4b3lydXRiem1xc2Nka25rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODk0MywiZXhwIjoyMDc5ODE0OTQzfQ.qrCt9_vF9twekh9DWRlmICtjkuiCFbqdfuggXz4GYL8');

async function check() {
  const { data, error } = await supabase.from('project_modules').select('id, name, phase').limit(1);
  if (error && error.message.includes('phase')) {
    console.log('NO_PHASE_COLUMN');
  } else {
    console.log('HAS_PHASE_COLUMN');
  }
}
check();
