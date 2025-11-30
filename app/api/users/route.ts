import { NextRequest, NextResponse } from 'next/server';
import { createUser, updateUser, deleteUser, updateUserModulePermissions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

// GET - List all users
export async function GET() {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, email, full_name, role, is_admin, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, full_name, role, modulePermissions } = body;

    // Validation
    if (!full_name || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if username or email is provided
    if (!username && !email) {
      return NextResponse.json(
        { error: 'Either username or email is required' },
        { status: 400 }
      );
    }

    // Create user
    const result = await createUser({
      username,
      email,
      password,
      full_name,
      role,
      is_admin: role === 'admin',
    });

    if (!result.success || !result.user) {
      return NextResponse.json(
        { error: result.error || 'Failed to create user' },
        { status: 400 }
      );
    }

    // Set module permissions if provided
    if (modulePermissions && Array.isArray(modulePermissions)) {
      await updateUserModulePermissions(result.user.id, modulePermissions);
    }

    return NextResponse.json({ success: true, user: result.user });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update user
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, full_name, role, password, modulePermissions } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Update user
    const updates: any = {};
    if (full_name) updates.full_name = full_name;
    if (role) updates.role = role;
    if (password) updates.password = password;

    const result = await updateUser(userId, updates);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update user' },
        { status: 400 }
      );
    }

    // Update module permissions if provided
    if (modulePermissions && Array.isArray(modulePermissions)) {
      await updateUserModulePermissions(userId, modulePermissions);
    }

    return NextResponse.json({ success: true, user: result.user });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete user
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const result = await deleteUser(userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete user' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
