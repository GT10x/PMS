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

// GET /api/projects - Get all projects with team members
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);

    if (!currentUser || !currentUser.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all projects
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectsError) {
      return NextResponse.json({ error: projectsError.message }, { status: 500 });
    }

    // Get all project members with user details
    const { data: projectMembers, error: membersError } = await supabaseAdmin
      .from('project_members')
      .select(`
        project_id,
        user_id,
        role,
        user_profiles (
          id,
          name,
          role
        )
      `);

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    // Combine projects with their team members
    const projectsWithMembers = projects.map(project => ({
      ...project,
      team_members: projectMembers
        .filter(pm => pm.project_id === project.id)
        .map(pm => ({
          id: pm.user_id,
          name: pm.user_profiles?.name || 'Unknown',
          role: pm.user_profiles?.role || 'Unknown'
        }))
    }));

    return NextResponse.json(projectsWithMembers);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects - Create a new project
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);

    if (!currentUser || !currentUser.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, status, priority, start_date, end_date, team_members } = body;

    // Validate required fields
    if (!name || !status) {
      return NextResponse.json({ error: 'Name and status are required' }, { status: 400 });
    }

    // Create project
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .insert({
        name,
        description,
        status,
        priority: priority || 'medium',
        start_date,
        end_date,
        created_by: currentUser.id
      })
      .select()
      .single();

    if (projectError) {
      return NextResponse.json({ error: projectError.message }, { status: 500 });
    }

    // Assign team members
    if (team_members && team_members.length > 0) {
      const memberInserts = team_members.map((userId: string) => ({
        project_id: project.id,
        user_id: userId,
        role: null
      }));

      const { error: membersError } = await supabaseAdmin
        .from('project_members')
        .insert(memberInserts);

      if (membersError) {
        // Rollback: delete the project if member assignment fails
        await supabaseAdmin.from('projects').delete().eq('id', project.id);
        return NextResponse.json({ error: membersError.message }, { status: 500 });
      }
    }

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
