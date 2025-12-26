const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setup() {
  // Find int-video project
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, api_key')
    .ilike('name', '%int%video%');

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  if (!projects || projects.length === 0) {
    console.log('No int-video project found. Looking for all projects...');
    const { data: all } = await supabase.from('projects').select('id, name');
    console.log('All projects:', JSON.stringify(all, null, 2));
    return;
  }

  const project = projects[0];
  console.log('Found project:', project.name, '(ID:', project.id + ')');

  // Generate API key (28 chars to fit VARCHAR(64))
  const apiKey = 'pms_' + crypto.randomBytes(20).toString('hex');

  // Update project with API key
  const { error: updateError } = await supabase
    .from('projects')
    .update({ api_key: apiKey })
    .eq('id', project.id);

  if (updateError) {
    console.log('Error updating:', updateError.message);
    return;
  }

  console.log('\n✅ API Key generated successfully!');
  console.log('\n=== INT-VIDEO INTEGRATION SETUP ===');
  console.log('Project:', project.name);
  console.log('API Key:', apiKey);
  console.log('\nAdd to int-video .env.local:');
  console.log('PMS_API_KEY=' + apiKey);
}

setup();
