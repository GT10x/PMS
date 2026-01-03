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

// GET /api/notifications/counts - Get unread counts for all user's projects
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdminOrPM = currentUser.is_admin || currentUser.role === 'project_manager';

    // Get projects based on role
    let projectIds: string[] = [];

    if (isAdminOrPM) {
      // Get all projects
      const { data: projects } = await supabaseAdmin
        .from('projects')
        .select('id');
      projectIds = projects?.map(p => p.id) || [];
    } else {
      // Get assigned projects
      const { data: memberships } = await supabaseAdmin
        .from('project_members')
        .select('project_id')
        .eq('user_id', currentUser.id);
      projectIds = memberships?.map(m => m.project_id) || [];
    }

    if (projectIds.length === 0) {
      return NextResponse.json({ counts: {} });
    }

    // Get user's last read timestamps for each project
    const { data: readRecords } = await supabaseAdmin
      .from('user_project_reads')
      .select('*')
      .eq('user_id', currentUser.id)
      .in('project_id', projectIds);

    const readMap = new Map();
    readRecords?.forEach(r => readMap.set(r.project_id, r));

    // Calculate counts for each project
    const counts: Record<string, { chat: number; reports: number; total: number }> = {};

    for (const projectId of projectIds) {
      const readRecord = readMap.get(projectId);
      const lastChatRead = readRecord?.last_chat_read_at || new Date(0).toISOString();
      const lastReportsRead = readRecord?.last_reports_read_at || new Date(0).toISOString();

      // Count unread chat messages (excluding user's own messages)
      const { count: chatCount } = await supabaseAdmin
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .neq('sender_id', currentUser.id)
        .gt('created_at', lastChatRead);

      // Count unread reports (excluding user's own reports)
      const { count: reportsCount } = await supabaseAdmin
        .from('project_reports')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .neq('reported_by', currentUser.id)
        .or('is_deleted.is.null,is_deleted.eq.false')
        .gt('created_at', lastReportsRead);

      counts[projectId] = {
        chat: chatCount || 0,
        reports: reportsCount || 0,
        total: (chatCount || 0) + (reportsCount || 0)
      };
    }

    return NextResponse.json({ counts });
  } catch (error) {
    console.error('Error fetching notification counts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
