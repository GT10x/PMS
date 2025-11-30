-- Add missing columns to user_profiles table to make it compatible with the app

-- Add password_hash column if it doesn't exist
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add username column if it doesn't exist
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- Add is_admin column if it doesn't exist
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Update the existing user to have admin access and a password
UPDATE user_profiles
SET
  password_hash = '$2a$10$xUqZ5iY0HZqB4KxLz1jn5.VGvN8zP7yJ2KQ8RoK3mLQ7tN9pX8YWu',
  is_admin = TRUE,
  full_name = 'Piush Thakker',
  role = 'admin',
  username = 'piush008'
WHERE email = 'piush008@gmail.com';
