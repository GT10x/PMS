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

// GET /api/projects/[id] - Get project details
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

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/projects/[id] - Update a project
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(req);

    if (!currentUser || (!currentUser.is_admin && currentUser.role !== 'project_manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, status, priority, start_date, team_members, webhook_url, deploy_url, stakeholders } = body;

    // Update project (only include fields that are provided)
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (start_date !== undefined) updateData.start_date = start_date || null; // Convert empty string to null
    if (webhook_url !== undefined) updateData.webhook_url = webhook_url;
    if (deploy_url !== undefined) updateData.deploy_url = deploy_url;
    if (stakeholders !== undefined) updateData.stakeholders = stakeholders;

    // @ts-ignore - Supabase types are too strict
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (projectError) {
      return NextResponse.json({ error: projectError.message }, { status: 500 });
    }

    // Update team members only if team_members array is provided in the request
    if (team_members !== undefined) {
      // Delete all existing members for this project
      const { error: deleteError } = await supabaseAdmin
        .from('project_members')
        .delete()
        .eq('project_id', id);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }

      // Insert new members if any are provided
      if (Array.isArray(team_members) && team_members.length > 0) {
        const memberInserts = team_members.map((userId: string) => ({
          project_id: id,
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
    }

    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id] - Delete a project
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(req);

    if (!currentUser || (!currentUser.is_admin && currentUser.role !== 'project_manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Delete project (cascade will delete project_members automatically)
    const { error } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
