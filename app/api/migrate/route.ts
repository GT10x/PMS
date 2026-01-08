import { NextResponse } from 'next/server';
// @ts-ignore - pg types not needed for this endpoint
import { Client } from 'pg';
import bcrypt from 'bcryptjs';

// IMPORTANT: This endpoint should be disabled after first use for security
const MIGRATION_ENABLED = true;

export async function GET() {
  if (!MIGRATION_ENABLED) {
    return NextResponse.json(
      { error: 'Migration endpoint disabled' },
      { status: 403 }
    );
  }

  try {
    // Try different connection methods
    const connectionAttempts = [
      // Attempt 1: Using pooler with IPv6
      'postgresql://postgres.loihxoyrutbzmqscdknk:sAAEJaHStl8UTvCo@aws-0-ap-south-1.pooler.supabase.com:5432/postgres',
      // Attempt 2: Direct connection
      'postgresql://postgres:sAAEJaHStl8UTvCo@db.loihxoyrutbzmqscdknk.supabase.co:5432/postgres',
      // Attempt 3: Transaction pooler
      'postgresql://postgres.loihxoyrutbzmqscdknk:sAAEJaHStl8UTvCo@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
    ];

    let client: Client | null = null;
    let connectionError: any = null;

    for (const connString of connectionAttempts) {
      try {
        console.log('Trying connection...');
        client = new Client({
          connectionString: connString,
          ssl: { rejectUnauthorized: false }
        });

        await client.connect();
        console.log('Connected!');
        break;
      } catch (err: any) {
        connectionError = err;
        console.log('Connection failed:', err.message);
        client = null;
      }
    }

    if (!client) {
      return NextResponse.json({
        error: 'Could not connect to database',
        details: connectionError?.message,
        suggestion: 'Using Supabase REST API fallback instead',
        sql: `-- Run this SQL in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/loihxoyrutbzmqscdknk/sql/new

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

UPDATE user_profiles
SET
  password_hash = '$2a$10$xUqZ5iY0HZqB4KxLz1jn5.VGvN8zP7yJ2KQ8RoK3mLQ7tN9pX8YWu',
  is_admin = TRUE,
  full_name = 'Piush Thakker',
  role = 'admin',
  username = 'piush008'
WHERE email = 'piush008@gmail.com';`
      }, { status: 500 });
    }

    // Generate password hash
    const password = 'Admin@123';
    const passwordHash = await bcrypt.hash(password, 10);

    // Run migration
    console.log('Running migration SQL...');

    // Step 1: Add columns
    await client.query(`
      ALTER TABLE user_profiles
      ADD COLUMN IF NOT EXISTS password_hash TEXT,
      ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE
    `);

    // Step 2: Update user
    const updateResult = await client.query(`
      UPDATE user_profiles
      SET
        password_hash = $1,
        is_admin = TRUE,
        full_name = 'Piush Thakker',
        role = 'admin',
        username = 'piush008'
      WHERE email = 'piush008@gmail.com'
      RETURNING id, email, full_name, role, is_admin, username
    `, [passwordHash]);

    await client.end();

    if (updateResult.rows.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Migration completed successfully!',
        user: updateResult.rows[0],
        credentials: {
          email: 'piush008@gmail.com',
          password: 'Admin@123'
        }
      });
    }

    return NextResponse.json({
      error: 'User not found or not updated'
    }, { status: 404 });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      error: 'Migration failed',
      details: error.message,
      sql: `-- If direct connection fails, run this SQL manually:
-- https://supabase.com/dashboard/project/loihxoyrutbzmqscdknk/sql/new

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

UPDATE user_profiles
SET
  password_hash = '$2a$10$xUqZ5iY0HZqB4KxLz1jn5.VGvN8zP7yJ2KQ8RoK3mLQ7tN9pX8YWu',
  is_admin = TRUE,
  full_name = 'Piush Thakker',
  role = 'admin',
  username = 'piush008'
WHERE email = 'piush008@gmail.com';`
    }, { status: 500 });
  }
}
