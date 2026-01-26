// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

// Master Admin ID - only this user can delete features
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

// PUT /api/projects/[id]/modules/[moduleId]/features/[featureId] - Update a feature
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string; featureId: string }> }
) {
  try {
    const { featureId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManageModules(currentUser)) {
      return NextResponse.json({ error: 'Only Project Managers and Admins can update features' }, { status: 403 });
    }

    const body = await req.json();
    const { name, sort_order, phase } = body;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name.trim();
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (phase !== undefined) updateData.phase = phase;

    const { data: feature, error } = await supabaseAdmin
      .from('module_features')
      .update(updateData)
      .eq('id', featureId)
      .select(`
        *,
        created_by_user:user_profiles!module_features_created_by_fkey(id, full_name),
        remarks:feature_remarks(
          *,
          created_by_user:user_profiles!feature_remarks_created_by_fkey(id, full_name)
        )
      `)
      .single();

    if (error) {
      console.error('Error updating feature:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sort remarks
    const featureWithSortedRemarks = {
      ...feature,
      remarks: (feature.remarks || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
    };

    return NextResponse.json({ feature: featureWithSortedRemarks });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/modules/[moduleId]/features/[featureId] - Delete a feature (Master Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string; featureId: string }> }
) {
  try {
    const { featureId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only master admin can delete features
    if (!isMasterAdmin(currentUser)) {
      return NextResponse.json({
        error: 'Only the master admin can delete features. Contact Piyush to remove features.'
      }, { status: 403 });
    }

    // Delete the feature (remarks will cascade delete)
    const { error } = await supabaseAdmin
      .from('module_features')
      .delete()
      .eq('id', featureId);

    if (error) {
      console.error('Error deleting feature:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
