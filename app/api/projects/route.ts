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

// GET /api/projects - Get all projects with team members
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);

    if (!currentUser || (!currentUser.is_admin && currentUser.role !== 'project_manager')) {
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
        project_roles,
        user_profiles (
          id,
          full_name,
          role
        )
      `);

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    // Combine projects with their team members
    const projectsWithMembers = projects.map(project => ({
      ...project,
      members: projectMembers
        .filter(pm => pm.project_id === project.id)
        .map(pm => ({
          user_id: pm.user_id,
          full_name: pm.user_profiles?.full_name || 'Unknown',
          role: pm.user_profiles?.role || 'Unknown',
          project_roles: pm.project_roles || []
        }))
    }));

    return NextResponse.json({ projects: projectsWithMembers }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects - Create a new project
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);

    if (!currentUser || (!currentUser.is_admin && currentUser.role !== 'project_manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, status, priority, start_date, end_date, team_members } = body;

    // Validate required fields
    if (!name || !status) {
      return NextResponse.json({ error: 'Name and status are required' }, { status: 400 });
    }

    // Create project (only include dates if provided)
    const projectData: any = {
      name,
      description,
      status,
      priority: priority || 'medium',
      created_by: currentUser.id
    };

    if (start_date) projectData.start_date = start_date;

    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .insert(projectData)
      .select()
      .single();

    if (projectError) {
      return NextResponse.json({ error: projectError.message }, { status: 500 });
    }

    // Assign team members
    // team_members can be either:
    // - Array of user IDs (legacy): ["user1", "user2"]
    // - Array of objects with roles: [{user_id: "user1", project_roles: ["tester", "developer"]}]
    if (team_members && team_members.length > 0) {
      const memberInserts = team_members.map((member: string | { user_id: string; project_roles?: string[] }) => {
        if (typeof member === 'string') {
          return {
            project_id: project.id,
            user_id: member,
            role: null,
            project_roles: []
          };
        } else {
          return {
            project_id: project.id,
            user_id: member.user_id,
            role: null,
            project_roles: member.project_roles || []
          };
        }
      });

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
