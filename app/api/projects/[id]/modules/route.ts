// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

// Master Admin ID - only this user can delete modules and features
const MASTER_ADMIN_ID = 'd60a4c5e-aa9f-4cdb-999a-41f0bd23d09e';

// Check if user is the master admin
function isMasterAdmin(user: any) {
  return user?.id === MASTER_ADMIN_ID;
}

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

// Check if user can manage modules (PM, Admin, CTO, Consultant)
function canManageModules(user: any) {
  if (!user) return false;
  return user.is_admin ||
         user.role === 'project_manager' ||
         user.role === 'cto' ||
         user.role === 'consultant';
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
      .order('sort_order', { ascending: true, nullsFirst: false })
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
    const { name, description, priority, status, eta, stakeholders, phase } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Module name is required' }, { status: 400 });
    }

    // Get max sort_order for this project
    const { data: maxOrderResult } = await supabaseAdmin
      .from('project_modules')
      .select('sort_order')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: false, nullsFirst: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrderResult?.sort_order ?? -1) + 1;

    // Generate auto code for the module (M1, M2, etc.)
    // Fetch all codes and find max numerically (string sort breaks after M9)
    const { data: allModuleCodes } = await supabaseAdmin
      .from('project_modules')
      .select('code')
      .eq('project_id', projectId)
      .not('code', 'is', null);

    let nextCodeNum = 1;
    if (allModuleCodes && allModuleCodes.length > 0) {
      const numbers = allModuleCodes
        .map((m: any) => {
          const match = m.code?.match(/M(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((n: number) => n > 0);
      if (numbers.length > 0) {
        nextCodeNum = Math.max(...numbers) + 1;
      }
    }
    const moduleCode = `M${nextCodeNum}`;

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
        sort_order: nextOrder,
        phase: phase || 1,
        code: moduleCode,
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

    const body = await req.json();
    const { module_id, name, description, priority, status, eta, stakeholders, phase } = body;

    // Testers can only update phase on modules they created
    if (!canManageModules(currentUser)) {
      if (currentUser.role === 'tester') {
        // Only allow phase updates on own modules
        const isPhaseOnly = phase !== undefined &&
          name === undefined && description === undefined &&
          priority === undefined && status === undefined &&
          eta === undefined && stakeholders === undefined;
        if (!isPhaseOnly) {
          return NextResponse.json({ error: 'You can only update the phase of modules you created' }, { status: 403 });
        }
        const { data: existing } = await supabaseAdmin
          .from('project_modules')
          .select('created_by')
          .eq('id', module_id)
          .single();
        if (existing?.created_by !== currentUser.id) {
          return NextResponse.json({ error: 'You can only update modules you created' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'You do not have permission to update modules' }, { status: 403 });
      }
    }

    if (!module_id) {
      return NextResponse.json({ error: 'module_id is required' }, { status: 400 });
    }

    // Check if features are being deleted (description lines reduced)
    // Only master admin can delete features
    if (description !== undefined) {
      const { data: existingModule } = await supabaseAdmin
        .from('project_modules')
        .select('description')
        .eq('id', module_id)
        .single();

      if (existingModule?.description) {
        const existingLines = existingModule.description.split('\n').filter((line: string) => line.trim()).length;
        const newLines = description ? description.split('\n').filter((line: string) => line.trim()).length : 0;

        // If lines decreased, a feature was deleted - only master admin can do this
        if (newLines < existingLines && !isMasterAdmin(currentUser)) {
          return NextResponse.json({
            error: 'Only the master admin can delete features. Contact Piyush to remove features.'
          }, { status: 403 });
        }
      }
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (eta !== undefined) updateData.eta = eta || null; // Convert empty string to null
    if (stakeholders !== undefined) updateData.stakeholders = stakeholders;
    if (phase !== undefined) updateData.phase = phase;

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

// PATCH /api/projects/[id]/modules - Bulk update module order
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManageModules(currentUser)) {
      return NextResponse.json({ error: 'Only Project Managers and Admins can reorder modules' }, { status: 403 });
    }

    const body = await req.json();
    const { modules } = body; // Array of { id, sort_order }

    if (!Array.isArray(modules)) {
      return NextResponse.json({ error: 'Modules array is required' }, { status: 400 });
    }

    // Update each module's sort_order
    for (const m of modules) {
      await supabaseAdmin
        .from('project_modules')
        .update({ sort_order: m.sort_order, updated_at: new Date().toISOString() })
        .eq('id', m.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/modules - Delete a module (Master Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only master admin can delete modules
    if (!isMasterAdmin(currentUser)) {
      return NextResponse.json({
        error: 'Only the master admin can delete modules. Contact Piyush to delete modules.'
      }, { status: 403 });
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
