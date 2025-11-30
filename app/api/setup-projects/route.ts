// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    // First, verify we can connect
    const { data: testData, error: testError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .limit(1);

    if (testError) {
      return NextResponse.json({
        error: 'Database connection failed',
        details: testError.message
      }, { status: 500 });
    }

    // Try to create a test project to see if table exists
    const testUserId = testData?.[0]?.id || '00000000-0000-0000-0000-000000000000';

    const { data: createTest, error: createError } = await supabaseAdmin
      .from('projects')
      .insert({
        name: 'Setup Test Project',
        description: 'This is a test project created during setup',
        status: 'planning',
        priority: 'low',
        created_by: testUserId
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json({
        error: 'Projects table does not exist',
        message: createError.message,
        instructions: 'Please run the SQL script in Supabase SQL Editor to create the tables.',
        sql_url: 'https://supabase.com/dashboard/project/loihxoyrutbzmqscdknk/sql/new',
        sql: `
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
        `
      }, { status: 500 });
    }

    // If we got here, table exists! Delete the test project
    if (createTest) {
      await supabaseAdmin
        .from('projects')
        .delete()
        .eq('id', createTest.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Projects tables are set up and working correctly!'
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Setup check failed',
      details: error.message
    }, { status: 500 });
  }
}
