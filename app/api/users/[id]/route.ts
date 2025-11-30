import { NextRequest, NextResponse } from 'next/server';
import { updateUser, deleteUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { User } from '@/lib/types';

// Get current user from cookie
async function getCurrentUser(request: NextRequest): Promise<User | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  if (!userId) {
    return null;
  }

  const { data } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return data as User | null;
}

// PUT /api/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser || !currentUser.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { full_name, role, password } = body;

    const updates: any = {};
    if (full_name) updates.full_name = full_name;
    if (role) updates.role = role;
    if (password) updates.password = password;

    const result = await updateUser(id, updates);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update user' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser || !currentUser.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Prevent deleting yourself
    if (id === currentUser.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const result = await deleteUser(id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete user' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
