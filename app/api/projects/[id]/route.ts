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

// PUT /api/projects/[id] - Update a project
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser(req);

    if (!currentUser || !currentUser.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, status, priority, start_date, end_date, team_members } = body;

    // Update project
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .update({
        name,
        description,
        status,
        priority,
        start_date,
        end_date,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (projectError) {
      return NextResponse.json({ error: projectError.message }, { status: 500 });
    }

    // Update team members: delete all existing and insert new ones
    const { error: deleteError } = await supabaseAdmin
      .from('project_members')
      .delete()
      .eq('project_id', params.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (team_members && team_members.length > 0) {
      const memberInserts = team_members.map((userId: string) => ({
        project_id: params.id,
        user_id: userId,
        role: null
      }));

      const { error: membersError } = await supabaseAdmin
        .from('project_members')
        .insert(memberInserts);

      if (membersError) {
        return NextResponse.json({ error: membersError.message }, { status: 500 });
      }
    }

    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id] - Delete a project
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser(req);

    if (!currentUser || !currentUser.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete project (cascade will delete project_members automatically)
    const { error } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
