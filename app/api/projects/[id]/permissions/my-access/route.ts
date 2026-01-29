import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

// GET /api/projects/[id]/permissions/my-access
// Returns the current user's allowed modules for this project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ allowedModules: [], isRestricted: false });
    }

    // Check if admin
    const { data: user } = await supabaseAdmin
      .from('user_profiles')
      .select('is_admin, role')
      .eq('id', userId)
      .single();

    if ((user as any)?.is_admin) {
      return NextResponse.json({ allowedModules: [], isRestricted: false });
    }

    // Check permissions
    const { data: userPermissions } = await (supabaseAdmin as any)
      .from('stakeholder_module_permissions')
      .select('module_name')
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (!userPermissions || userPermissions.length === 0) {
      // No restrictions
      return NextResponse.json({ allowedModules: [], isRestricted: false });
    }

    const allowedModules = userPermissions.map((p: any) => p.module_name);
    return NextResponse.json({ allowedModules, isRestricted: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ allowedModules: [], isRestricted: false });
  }
}
