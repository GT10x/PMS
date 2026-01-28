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

// GET /api/projects/[id]/permissions/check?module=reports
// Returns whether current user has access to the specified module
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

    const { searchParams } = new URL(request.url);
    const moduleName = searchParams.get('module');

    if (!moduleName) {
      return NextResponse.json({ error: 'module parameter is required' }, { status: 400 });
    }

    // Admins always have full access
    if (currentUser.is_admin) {
      return NextResponse.json({ hasAccess: true, reason: 'admin' });
    }

    // Check if user has ANY permissions set for this project
    const { data: userPermissions, error } = await (supabaseAdmin as any)
      .from('stakeholder_module_permissions')
      .select('module_name')
      .eq('project_id', projectId)
      .eq('user_id', currentUser.id);

    if (error) {
      console.error('Error checking permissions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If no permissions are set for this user, they have full access (default)
    if (!userPermissions || userPermissions.length === 0) {
      return NextResponse.json({ hasAccess: true, reason: 'no_restrictions' });
    }

    // Check if the requested module is in their permissions
    const allowedModules = userPermissions.map((p: any) => p.module_name);
    const hasAccess = allowedModules.includes(moduleName);

    return NextResponse.json({
      hasAccess,
      reason: hasAccess ? 'permitted' : 'restricted',
      allowedModules
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
