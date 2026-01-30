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

// Check if user can manage modules (PM, Admin, CTO, Consultant)
function canManageModules(user: any) {
  if (!user) return false;
  return user.is_admin ||
         user.role === 'project_manager' ||
         user.role === 'cto' ||
         user.role === 'consultant';
}

// Testers can also add remarks/functions
function canAddContent(user: any) {
  if (!user) return false;
  return canManageModules(user) || user.role === 'tester';
}

// GET /api/projects/[id]/modules/[moduleId]/features/[featureId]/remarks - Get all remarks for a feature
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string; featureId: string }> }
) {
  try {
    const { featureId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: remarks, error } = await supabaseAdmin
      .from('feature_remarks')
      .select(`
        *,
        created_by_user:user_profiles!feature_remarks_created_by_fkey(id, full_name)
      `)
      .eq('feature_id', featureId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching remarks:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ remarks: remarks || [] });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects/[id]/modules/[moduleId]/features/[featureId]/remarks - Create a new remark
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string; featureId: string }> }
) {
  try {
    const { featureId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canAddContent(currentUser)) {
      return NextResponse.json({ error: 'You do not have permission to add functions' }, { status: 403 });
    }

    const body = await req.json();
    const { content, image_url, voice_url } = body;

    if (!content?.trim() && !image_url && !voice_url) {
      return NextResponse.json({ error: 'Remark must have content or a file' }, { status: 400 });
    }

    const { data: maxOrderResult } = await supabaseAdmin
      .from('feature_remarks')
      .select('sort_order')
      .eq('feature_id', featureId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrderResult?.sort_order ?? -1) + 1;

    const { data: remark, error } = await supabaseAdmin
      .from('feature_remarks')
      .insert({
        feature_id: featureId,
        content: content?.trim() || null,
        image_url: image_url || null,
        voice_url: voice_url || null,
        sort_order: nextOrder,
        created_by: currentUser.id
      })
      .select(`
        *,
        created_by_user:user_profiles!feature_remarks_created_by_fkey(id, full_name)
      `)
      .single();

    if (error) {
      console.error('Error creating remark:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ remark }, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
