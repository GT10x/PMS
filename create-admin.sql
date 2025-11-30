-- Create Admin User for PMS
-- Email: piush008@gmail.com
-- Password: Admin@123

INSERT INTO users (email, password_hash, full_name, role, is_admin)
VALUES (
  'piush008@gmail.com',
  '$2a$10$xUqZ5iY0HZqB4KxLz1jn5.VGvN8zP7yJ2KQ8RoK3mLQ7tN9pX8YWu',
  'Piush Thakker',
  'admin',
  true
)
ON CONFLICT (email) DO NOTHING;
