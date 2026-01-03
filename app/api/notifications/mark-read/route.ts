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

// POST /api/notifications/mark-read - Mark chat or reports as read for a project
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { project_id, type } = body; // type: 'chat' | 'reports' | 'both'

    if (!project_id || !type) {
      return NextResponse.json({ error: 'project_id and type are required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Build update data
    const updateData: any = { updated_at: now };
    if (type === 'chat' || type === 'both') {
      updateData.last_chat_read_at = now;
    }
    if (type === 'reports' || type === 'both') {
      updateData.last_reports_read_at = now;
    }

    // Upsert the read record
    const { error } = await supabaseAdmin
      .from('user_project_reads')
      .upsert({
        user_id: currentUser.id,
        project_id,
        ...updateData
      }, {
        onConflict: 'user_id,project_id'
      });

    if (error) {
      console.error('Error marking as read:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in mark-read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
