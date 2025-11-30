-- First, create a function that can execute arbitrary SQL
CREATE OR REPLACE FUNCTION execute_migration()
RETURNS TEXT AS $$
BEGIN
  -- Add columns if they don't exist
  EXECUTE 'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS password_hash TEXT';
  EXECUTE 'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE';
  EXECUTE 'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE';

  -- Update the user
  EXECUTE 'UPDATE user_profiles SET
    password_hash = ''$2a$10$xUqZ5iY0HZqB4KxLz1jn5.VGvN8zP7yJ2KQ8RoK3mLQ7tN9pX8YWu'',
    is_admin = TRUE,
    full_name = ''Piush Thakker'',
    role = ''admin'',
    username = ''piush008''
  WHERE email = ''piush008@gmail.com''';

  RETURN 'Migration completed successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
