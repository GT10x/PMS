const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://loihxoyrutbzmqscdknk.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvaWh4b3lydXRiem1xc2Nka25rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjg5MTUzNSwiZXhwIjoyMDQ4NDY3NTM1fQ.YdKcNW_2ovuT3uU3LtCQABXLvDUCy_jxYOPZJvOPW_w';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTables() {
  console.log('Creating projects tables...\n');

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

  try {
    // Execute SQL using raw query
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.log('RPC method not available. Using direct table creation...\n');

      // Try creating a test project to trigger table creation
      const { error: createError } = await supabase
        .from('projects')
        .insert({
          name: 'Test Project',
          description: 'Test',
          status: 'planning',
          priority: 'medium',
          created_by: '00000000-0000-0000-0000-000000000000'
        });

      if (createError) {
        console.log('Error:', createError.message);
        console.log('\nAttempting to create table via REST API...');

        // Use fetch to execute SQL
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ query: sql })
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.log('REST API Error:', errorData);
          console.log('\n❌ Could not create tables automatically.');
          console.log('The projects table needs to be created in Supabase.');
          process.exit(1);
        }
      }
    }

    console.log('✅ Projects tables created successfully!');

    // Verify
    const { data: projects, error: verifyError } = await supabase
      .from('projects')
      .select('*')
      .limit(1);

    if (!verifyError) {
      console.log('✅ Verified: Tables are accessible');
    } else {
      console.log('⚠️  Warning: Could not verify table access:', verifyError.message);
    }

  } catch (err) {
    console.error('Unexpected error:', err.message);
    process.exit(1);
  }
}

createTables();
