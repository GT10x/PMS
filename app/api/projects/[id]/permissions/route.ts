import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_admin: boolean;
}

// Available modules that can have permissions set
const AVAILABLE_MODULES = [
  'overview',
  'reports',
  'versions',
  'modules',
  'flow',
  'chat',
  'stakeholders',
  'settings'
] as const;

// Get current user from cookie
async function getCurrentUser(): Promise<UserProfile | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  if (!userId) return null;

  const { data } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return data as UserProfile | null;
}

// Check if user can manage permissions (PM and Admin only)
function canManagePermissions(user: UserProfile | null): boolean {
  if (!user) return false;
  return user.is_admin || user.role === 'project_manager';
}

// GET /api/projects/[id]/permissions - Get all permissions for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all permissions for this project
    const { data: permissions, error } = await (supabaseAdmin as any)
      .from('stakeholder_module_permissions')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      console.error('Error fetching permissions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group permissions by user_id
    const permissionsByUser: Record<string, string[]> = {};
    (permissions || []).forEach((p: any) => {
      if (!permissionsByUser[p.user_id]) {
        permissionsByUser[p.user_id] = [];
      }
      permissionsByUser[p.user_id].push(p.module_name);
    });

    return NextResponse.json({
      permissions: permissionsByUser,
      availableModules: AVAILABLE_MODULES
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/projects/[id]/permissions - Update permissions for a user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManagePermissions(currentUser)) {
      return NextResponse.json({ error: 'Only PM and Admin can manage permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { user_id, modules } = body; // modules is an array of module names

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    if (!Array.isArray(modules)) {
      return NextResponse.json({ error: 'modules must be an array' }, { status: 400 });
    }

    // Validate module names
    const validModules = modules.filter((m: string) => AVAILABLE_MODULES.includes(m as any));

    // Delete existing permissions for this user in this project
    await (supabaseAdmin as any)
      .from('stakeholder_module_permissions')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', user_id);

    // Insert new permissions (if any modules selected)
    if (validModules.length > 0) {
      const permissionsToInsert = validModules.map((module_name: string) => ({
        project_id: projectId,
        user_id,
        module_name
      }));

      const { error } = await (supabaseAdmin as any)
        .from('stakeholder_module_permissions')
        .insert(permissionsToInsert);

      if (error) {
        console.error('Error inserting permissions:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      user_id,
      modules: validModules
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/permissions - Remove all permissions for a user (give full access)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManagePermissions(currentUser)) {
      return NextResponse.json({ error: 'Only PM and Admin can manage permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Delete all permissions for this user - they'll have full access
    await (supabaseAdmin as any)
      .from('stakeholder_module_permissions')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
