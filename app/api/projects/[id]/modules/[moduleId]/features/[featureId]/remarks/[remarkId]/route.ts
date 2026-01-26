// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

// Master Admin ID
const MASTER_ADMIN_ID = 'd60a4c5e-aa9f-4cdb-999a-41f0bd23d09e';

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

// Check if user is the master admin
function isMasterAdmin(user: any) {
  return user?.id === MASTER_ADMIN_ID;
}

// PUT /api/projects/[id]/modules/[moduleId]/features/[featureId]/remarks/[remarkId] - Update a remark
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string; featureId: string; remarkId: string }> }
) {
  try {
    const { remarkId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManageModules(currentUser)) {
      return NextResponse.json({ error: 'Only Project Managers and Admins can update remarks' }, { status: 403 });
    }

    const body = await req.json();
    const { content, image_url, voice_url, sort_order } = body;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (content !== undefined) updateData.content = content?.trim() || null;
    if (image_url !== undefined) updateData.image_url = image_url || null;
    if (voice_url !== undefined) updateData.voice_url = voice_url || null;
    if (sort_order !== undefined) updateData.sort_order = sort_order;

    const { data: remark, error } = await supabaseAdmin
      .from('feature_remarks')
      .update(updateData)
      .eq('id', remarkId)
      .select(`
        *,
        created_by_user:user_profiles!feature_remarks_created_by_fkey(id, full_name)
      `)
      .single();

    if (error) {
      console.error('Error updating remark:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ remark });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/modules/[moduleId]/features/[featureId]/remarks/[remarkId] - Delete a remark
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string; featureId: string; remarkId: string }> }
) {
  try {
    const { remarkId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user can delete remarks - either master admin or the creator
    const { data: existingRemark } = await supabaseAdmin
      .from('feature_remarks')
      .select('created_by')
      .eq('id', remarkId)
      .single();

    const canDelete = isMasterAdmin(currentUser) ||
                      existingRemark?.created_by === currentUser.id ||
                      canManageModules(currentUser);

    if (!canDelete) {
      return NextResponse.json({
        error: 'You can only delete remarks you created'
      }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('feature_remarks')
      .delete()
      .eq('id', remarkId);

    if (error) {
      console.error('Error deleting remark:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
