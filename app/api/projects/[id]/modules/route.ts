// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

// Get current user from cookie
async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  if (!userId) return null;

  const { data } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return data;
}

// Check if user can manage modules (PM, Admin, CTO)
function canManageModules(user: any) {
  if (!user) return false;
  return user.is_admin ||
         user.role === 'project_manager' ||
         user.role === 'cto';
}

// GET /api/projects/[id]/modules - Get all modules for a project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: modules, error } = await supabaseAdmin
      .from('project_modules')
      .select(`
        *,
        created_by_user:user_profiles!project_modules_created_by_fkey(id, full_name)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching modules:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ modules: modules || [] });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects/[id]/modules - Create a new module
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManageModules(currentUser)) {
      return NextResponse.json({ error: 'Only Project Managers and Admins can create modules' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, priority, status, eta, stakeholders } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Module name is required' }, { status: 400 });
    }

    const { data: module, error } = await supabaseAdmin
      .from('project_modules')
      .insert({
        project_id: projectId,
        name: name.trim(),
        description: description || null,
        priority: priority || 'medium',
        status: status || 'planned',
        eta: eta || null,
        stakeholders: stakeholders || [],
        created_by: currentUser.id
      })
      .select(`
        *,
        created_by_user:user_profiles!project_modules_created_by_fkey(id, full_name)
      `)
      .single();

    if (error) {
      console.error('Error creating module:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ module }, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/projects/[id]/modules - Update a module
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManageModules(currentUser)) {
      return NextResponse.json({ error: 'Only Project Managers and Admins can update modules' }, { status: 403 });
    }

    const body = await req.json();
    const { module_id, name, description, priority, status, eta, stakeholders } = body;

    if (!module_id) {
      return NextResponse.json({ error: 'module_id is required' }, { status: 400 });
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (eta !== undefined) updateData.eta = eta;
    if (stakeholders !== undefined) updateData.stakeholders = stakeholders;

    const { data: module, error } = await supabaseAdmin
      .from('project_modules')
      .update(updateData)
      .eq('id', module_id)
      .select(`
        *,
        created_by_user:user_profiles!project_modules_created_by_fkey(id, full_name)
      `)
      .single();

    if (error) {
      console.error('Error updating module:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ module });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/modules - Delete a module
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManageModules(currentUser)) {
      return NextResponse.json({ error: 'Only Project Managers and Admins can delete modules' }, { status: 403 });
    }

    const url = new URL(req.url);
    const moduleId = url.searchParams.get('module_id');

    if (!moduleId) {
      return NextResponse.json({ error: 'module_id is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('project_modules')
      .delete()
      .eq('id', moduleId);

    if (error) {
      console.error('Error deleting module:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
