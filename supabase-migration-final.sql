-- =============================================
-- PMS - Final Migration (Safe Clean Install)
-- =============================================

-- Enable UUID extension first
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop everything safely (ignore errors if not exists)
DO $$
BEGIN
    -- Drop policies
    DROP POLICY IF EXISTS "Anyone can view users" ON users;
    DROP POLICY IF EXISTS "Admins can insert users" ON users;
    DROP POLICY IF EXISTS "Admins can update users" ON users;
    DROP POLICY IF EXISTS "Admins can delete users" ON users;
    DROP POLICY IF EXISTS "Users can view their module permissions" ON user_module_permissions;
    DROP POLICY IF EXISTS "Admins can manage module permissions" ON user_module_permissions;
    DROP POLICY IF EXISTS "Anyone can view projects" ON projects;
    DROP POLICY IF EXISTS "Anyone can create projects" ON projects;
    DROP POLICY IF EXISTS "Anyone can update projects" ON projects;
    DROP POLICY IF EXISTS "Anyone can delete projects" ON projects;
    DROP POLICY IF EXISTS "Anyone can view modules" ON modules;
    DROP POLICY IF EXISTS "Anyone can manage modules" ON modules;
    DROP POLICY IF EXISTS "Anyone can view functionalities" ON functionalities;
    DROP POLICY IF EXISTS "Anyone can manage functionalities" ON functionalities;
    DROP POLICY IF EXISTS "Anyone can view tasks" ON tasks;
    DROP POLICY IF EXISTS "Anyone can manage tasks" ON tasks;
    DROP POLICY IF EXISTS "Anyone can view sprints" ON sprints;
    DROP POLICY IF EXISTS "Anyone can manage sprints" ON sprints;
    DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
    DROP POLICY IF EXISTS "Anyone can manage comments" ON comments;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Drop tables
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS sprints CASCADE;
DROP TABLE IF EXISTS functionalities CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS user_module_permissions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- =============================================
-- CREATE TABLES
-- =============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash TEXT,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'project_manager', 'cto', 'consultant', 'tester', 'developer')),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_module_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_name VARCHAR(255) NOT NULL,
    has_access BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, module_name)
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'review', 'completed', 'on_hold')),
    start_date DATE,
    end_date DATE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    module_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'testing', 'completed', 'deployed')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    owner_id UUID REFERENCES users(id),
    est_start_date DATE,
    est_end_date DATE,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, module_id)
);

CREATE TABLE functionalities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'testing', 'completed')),
    est_hours INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    functionality_id UUID REFERENCES functionalities(id) ON DELETE SET NULL,
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'backlog' CHECK (status IN ('backlog', 'todo', 'in_progress', 'code_review', 'testing', 'done')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    due_date DATE,
    est_hours INTEGER,
    actual_hours INTEGER,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sprint_number INTEGER NOT NULL,
    goal TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'review', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, sprint_number)
);

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_functionalities_updated_at BEFORE UPDATE ON functionalities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sprints_updated_at BEFORE UPDATE ON sprints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- RLS & POLICIES
-- =============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE functionalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view users" ON users FOR SELECT USING (true);
CREATE POLICY "Admins can insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update users" ON users FOR UPDATE USING (true);
CREATE POLICY "Admins can delete users" ON users FOR DELETE USING (true);

CREATE POLICY "Users can view their module permissions" ON user_module_permissions FOR SELECT USING (true);
CREATE POLICY "Admins can manage module permissions" ON user_module_permissions FOR ALL USING (true);

CREATE POLICY "Anyone can view projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Anyone can create projects" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update projects" ON projects FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete projects" ON projects FOR DELETE USING (true);

CREATE POLICY "Anyone can view modules" ON modules FOR SELECT USING (true);
CREATE POLICY "Anyone can manage modules" ON modules FOR ALL USING (true);

CREATE POLICY "Anyone can view functionalities" ON functionalities FOR SELECT USING (true);
CREATE POLICY "Anyone can manage functionalities" ON functionalities FOR ALL USING (true);

CREATE POLICY "Anyone can view tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Anyone can manage tasks" ON tasks FOR ALL USING (true);

CREATE POLICY "Anyone can view sprints" ON sprints FOR SELECT USING (true);
CREATE POLICY "Anyone can manage sprints" ON sprints FOR ALL USING (true);

CREATE POLICY "Anyone can view comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Anyone can manage comments" ON comments FOR ALL USING (true);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_user_module_permissions_user_id ON user_module_permissions(user_id);
CREATE INDEX idx_user_module_permissions_module_name ON user_module_permissions(module_name);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_modules_project_id ON modules(project_id);
CREATE INDEX idx_modules_status ON modules(status);
CREATE INDEX idx_modules_owner_id ON modules(owner_id);
CREATE INDEX idx_functionalities_module_id ON functionalities(module_id);
CREATE INDEX idx_functionalities_owner_id ON functionalities(owner_id);
CREATE INDEX idx_tasks_functionality_id ON tasks(functionality_id);
CREATE INDEX idx_tasks_module_id ON tasks(module_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_sprints_project_id ON sprints(project_id);
CREATE INDEX idx_sprints_status ON sprints(status);
CREATE INDEX idx_comments_task_id ON comments(task_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);

-- =============================================
-- CREATE ADMIN USER
-- =============================================

INSERT INTO users (email, password_hash, full_name, role, is_admin)
VALUES (
  'piush008@gmail.com',
  '$2a$10$xUqZ5iY0HZqB4KxLz1jn5.VGvN8zP7yJ2KQ8RoK3mLQ7tN9pX8YWu',
  'Piush Thakker',
  'admin',
  true
);
