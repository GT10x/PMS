-- This script creates a test user and assigns them to a project
-- Run this in Supabase SQL editor to test the project tabs feature

-- Step 1: Create a test developer user (if not exists)
INSERT INTO user_profiles (id, username, full_name, email, role, is_admin, password_hash)
VALUES (
  gen_random_uuid(),
  'testdev',
  'Test Developer',
  'testdev@example.com',
  'developer',
  false,
  '$2b$10$dummyhash' -- This is just a placeholder, you'll need to set a real password via the app
)
ON CONFLICT (username) DO NOTHING
RETURNING id;

-- Step 2: Get the user ID and a project ID
-- Replace 'YOUR_PROJECT_ID_HERE' with an actual project ID from your projects table
-- You can find project IDs by running: SELECT id, name FROM projects;

-- Step 3: Assign the test user to a project
-- First, get the test user's ID:
-- SELECT id FROM user_profiles WHERE username = 'testdev';
-- Then insert into project_members:

-- INSERT INTO project_members (project_id, user_id)
-- VALUES (
--   'YOUR_PROJECT_ID_HERE',
--   (SELECT id FROM user_profiles WHERE username = 'testdev')
-- );

-- Quick check queries:
-- See all users:
-- SELECT id, username, full_name, role, is_admin FROM user_profiles;

-- See all projects:
-- SELECT id, name, status, priority FROM projects;

-- See all project assignments:
-- SELECT pm.id, p.name as project_name, u.full_name as user_name
-- FROM project_members pm
-- JOIN projects p ON pm.project_id = p.id
-- JOIN user_profiles u ON pm.user_id = u.id;
