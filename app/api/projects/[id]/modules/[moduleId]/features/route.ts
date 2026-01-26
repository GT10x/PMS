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

// GET /api/projects/[id]/modules/[moduleId]/features - Get all features for a module with remarks
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    const { moduleId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get features with their remarks
    const { data: features, error } = await supabaseAdmin
      .from('module_features')
      .select(`
        *,
        created_by_user:user_profiles!module_features_created_by_fkey(id, full_name),
        remarks:feature_remarks(
          *,
          created_by_user:user_profiles!feature_remarks_created_by_fkey(id, full_name)
        )
      `)
      .eq('module_id', moduleId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching features:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sort remarks by sort_order for each feature
    const featuresWithSortedRemarks = (features || []).map(feature => ({
      ...feature,
      remarks: (feature.remarks || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
    }));

    return NextResponse.json({ features: featuresWithSortedRemarks });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects/[id]/modules/[moduleId]/features - Create a new feature
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    const { moduleId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManageModules(currentUser)) {
      return NextResponse.json({ error: 'Only Project Managers and Admins can create features' }, { status: 403 });
    }

    const body = await req.json();
    const { name, phase } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Feature name is required' }, { status: 400 });
    }

    // Get the max sort_order for this module
    const { data: maxOrderResult } = await supabaseAdmin
      .from('module_features')
      .select('sort_order')
      .eq('module_id', moduleId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrderResult?.sort_order ?? -1) + 1;

    const { data: feature, error } = await supabaseAdmin
      .from('module_features')
      .insert({
        module_id: moduleId,
        name: name.trim(),
        phase: phase || 1,
        sort_order: nextOrder,
        created_by: currentUser.id
      })
      .select(`
        *,
        created_by_user:user_profiles!module_features_created_by_fkey(id, full_name)
      `)
      .single();

    if (error) {
      console.error('Error creating feature:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return feature with empty remarks array
    return NextResponse.json({ feature: { ...feature, remarks: [] } }, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/projects/[id]/modules/[moduleId]/features - Bulk update feature order
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManageModules(currentUser)) {
      return NextResponse.json({ error: 'Only Project Managers and Admins can reorder features' }, { status: 403 });
    }

    const body = await req.json();
    const { features } = body; // Array of { id, sort_order }

    if (!Array.isArray(features)) {
      return NextResponse.json({ error: 'Features array is required' }, { status: 400 });
    }

    // Update each feature's sort_order
    for (const f of features) {
      await supabaseAdmin
        .from('module_features')
        .update({ sort_order: f.sort_order, updated_at: new Date().toISOString() })
        .eq('id', f.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
