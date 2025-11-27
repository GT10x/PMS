-- Add Modules and Sub-Functions Tables
-- Run this in Supabase SQL Editor

-- Modules Table (e.g., Student Management, Attendance, etc.)
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('planning', 'in_progress', 'review', 'completed')) DEFAULT 'planning',
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sub-Functions Table (e.g., Add Student, Edit Student, etc.)
CREATE TABLE IF NOT EXISTS sub_functions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
  assigned_to UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers for updated_at
CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sub_functions_updated_at BEFORE UPDATE ON sub_functions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_functions ENABLE ROW LEVEL SECURITY;

-- Modules Policies
CREATE POLICY "Users can view all modules" ON modules
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create modules" ON modules
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update modules" ON modules
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Project managers can delete modules" ON modules
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'project_manager'
    )
  );

-- Sub-Functions Policies
CREATE POLICY "Users can view all sub-functions" ON sub_functions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create sub-functions" ON sub_functions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update sub-functions" ON sub_functions
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete sub-functions" ON sub_functions
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_modules_status ON modules(status);
CREATE INDEX IF NOT EXISTS idx_modules_created_by ON modules(created_by);
CREATE INDEX IF NOT EXISTS idx_sub_functions_module_id ON sub_functions(module_id);
CREATE INDEX IF NOT EXISTS idx_sub_functions_status ON sub_functions(status);
CREATE INDEX IF NOT EXISTS idx_sub_functions_assigned_to ON sub_functions(assigned_to);
