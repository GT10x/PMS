const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('Running version testing schema migration...\n');

  const queries = [
    // 1. Add columns to project_versions
    `ALTER TABLE project_versions ADD COLUMN IF NOT EXISTS release_title TEXT`,
    `ALTER TABLE project_versions ADD COLUMN IF NOT EXISTS release_summary TEXT`,
    `ALTER TABLE project_versions ADD COLUMN IF NOT EXISTS deploy_url TEXT`,
    `ALTER TABLE project_versions ADD COLUMN IF NOT EXISTS git_commit VARCHAR(64)`,
    `ALTER TABLE project_versions ADD COLUMN IF NOT EXISTS git_branch VARCHAR(128)`,
    `ALTER TABLE project_versions ADD COLUMN IF NOT EXISTS webhook_url TEXT`,
    `ALTER TABLE project_versions ADD COLUMN IF NOT EXISTS tester_id UUID`,
    `ALTER TABLE project_versions ADD COLUMN IF NOT EXISTS tested_at TIMESTAMP`,
    `ALTER TABLE project_versions ADD COLUMN IF NOT EXISTS rebuild_requested BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE project_versions ADD COLUMN IF NOT EXISTS rebuild_requested_at TIMESTAMP`,
    `ALTER TABLE project_versions ADD COLUMN IF NOT EXISTS rebuild_notes TEXT`,

    // 2. Create version_changes table
    `CREATE TABLE IF NOT EXISTS version_changes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      version_id UUID NOT NULL REFERENCES project_versions(id) ON DELETE CASCADE,
      change_type VARCHAR(20) NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // 3. Create version_known_issues table
    `CREATE TABLE IF NOT EXISTS version_known_issues (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      version_id UUID NOT NULL REFERENCES project_versions(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      severity VARCHAR(20) DEFAULT 'low',
      resolved BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // 4. Create version_test_cases table
    `CREATE TABLE IF NOT EXISTS version_test_cases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      version_id UUID NOT NULL REFERENCES project_versions(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      steps JSONB DEFAULT '[]',
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // 5. Create version_test_results table
    `CREATE TABLE IF NOT EXISTS version_test_results (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      test_case_id UUID NOT NULL REFERENCES version_test_cases(id) ON DELETE CASCADE,
      tester_id UUID,
      status VARCHAR(20) DEFAULT 'pending',
      notes TEXT,
      attachments JSONB DEFAULT '[]',
      tested_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,

    // 6. Add webhook_secret to projects
    `ALTER TABLE projects ADD COLUMN IF NOT EXISTS webhook_secret VARCHAR(64)`
  ];

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    const shortQuery = query.substring(0, 60).replace(/\s+/g, ' ') + '...';

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: query });

      if (error) {
        // Try direct query if RPC fails
        const { error: directError } = await supabase.from('_migrations').select('*').limit(0);
        console.log(`[${i + 1}/${queries.length}] ${shortQuery}`);
        console.log(`   Note: RPC not available, please run SQL manually in Supabase`);
      } else {
        console.log(`[${i + 1}/${queries.length}] ✅ ${shortQuery}`);
      }
    } catch (err) {
      console.log(`[${i + 1}/${queries.length}] ⚠️  ${shortQuery}`);
      console.log(`   ${err.message}`);
    }
  }

  console.log('\n========================================');
  console.log('Migration script completed!');
  console.log('');
  console.log('If any queries failed, please run the SQL manually:');
  console.log('1. Go to Supabase Dashboard → SQL Editor');
  console.log('2. Copy contents of: migrations/version-testing-schema.sql');
  console.log('3. Run the SQL');
  console.log('========================================\n');
}

runMigration();
