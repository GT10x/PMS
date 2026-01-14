// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
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

// GET /api/users/[id]/projects - Get projects assigned to a user
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(req);

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Users can only see their own projects, unless they're admin/PM
    if (currentUser.id !== id && !currentUser.is_admin && currentUser.role !== 'project_manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get project memberships for this user
    const { data: memberships, error: membershipsError } = await supabaseAdmin
      .from('project_members')
      .select(`
        project_id,
        projects (
          id,
          name,
          description,
          status,
          priority
        )
      `)
      .eq('user_id', id);

    if (membershipsError) {
      return NextResponse.json({ error: membershipsError.message }, { status: 500 });
    }

    const projects = memberships
      .filter(m => m.projects)
      .map(m => m.projects);

    return NextResponse.json({ projects }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
