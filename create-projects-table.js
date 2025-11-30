const https = require('https');

const SUPABASE_URL = 'https://loihxoyrutbzmqscdknk.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvaWh4b3lydXRiem1xc2Nka25rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjg5MTUzNSwiZXhwIjoyMDQ4NDY3NTM1fQ.YdKcNW_2ovuT3uU3LtCQABXLvDUCy_jxYOPZJvOPW_w';

const sql = `
-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'review', 'completed', 'on_hold')),
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  start_date DATE,
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create project_members junction table
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role VARCHAR(100),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable all for admin" ON projects;
DROP POLICY IF EXISTS "Enable all for admin" ON project_members;

-- Create policies
CREATE POLICY "Enable all for admin" ON projects FOR ALL USING (true);
CREATE POLICY "Enable all for admin" ON project_members FOR ALL USING (true);
`;

const data = JSON.stringify({ query: sql });

const options = {
  hostname: 'loihxoyrutbzmqscdknk.supabase.co',
  port: 443,
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Length': data.length
  }
};

console.log('Creating projects tables in Supabase...\n');

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✓ Tables created successfully!');
      console.log('\nPlease run this SQL manually in Supabase SQL Editor if the API method failed:');
      console.log('URL: https://supabase.com/dashboard/project/loihxoyrutbzmqscdknk/sql/new\n');
      console.log(sql);
    } else {
      console.log(`✗ Failed with status ${res.statusCode}`);
      console.log('Response:', responseData);
      console.log('\nPlease run this SQL manually in Supabase SQL Editor:');
      console.log('URL: https://supabase.com/dashboard/project/loihxoyrutbzmqscdknk/sql/new\n');
      console.log(sql);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
  console.log('\nPlease run this SQL manually in Supabase SQL Editor:');
  console.log('URL: https://supabase.com/dashboard/project/loihxoyrutbzmqscdknk/sql/new\n');
  console.log(sql);
});

req.write(data);
req.end();
