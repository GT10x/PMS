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

// GET /api/notifications/report-replies?project_id=xxx - Get unread reply counts for reports in a project
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const projectId = url.searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    // Get all reports for this project
    const { data: reports } = await supabaseAdmin
      .from('project_reports')
      .select('id')
      .eq('project_id', projectId)
      .or('is_deleted.is.null,is_deleted.eq.false');

    if (!reports || reports.length === 0) {
      return NextResponse.json({ counts: {} });
    }

    const reportIds = reports.map(r => r.id);

    // Get user's last read timestamps for each report
    const { data: readRecords } = await supabaseAdmin
      .from('user_report_reads')
      .select('report_id, last_read_at')
      .eq('user_id', currentUser.id)
      .in('report_id', reportIds);

    const readMap = new Map();
    readRecords?.forEach(r => readMap.set(r.report_id, r.last_read_at));

    // Calculate unread reply counts for each report
    const counts: Record<string, number> = {};

    for (const reportId of reportIds) {
      const lastReadAt = readMap.get(reportId) || new Date(0).toISOString();

      // Count replies after last read (excluding user's own replies)
      const { count } = await supabaseAdmin
        .from('report_replies')
        .select('*', { count: 'exact', head: true })
        .eq('report_id', reportId)
        .neq('user_id', currentUser.id)
        .gt('created_at', lastReadAt);

      if (count && count > 0) {
        counts[reportId] = count;
      }
    }

    return NextResponse.json({ counts });
  } catch (error) {
    console.error('Error fetching report reply counts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/notifications/report-replies - Mark a report as read
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { report_id } = body;

    if (!report_id) {
      return NextResponse.json({ error: 'report_id is required' }, { status: 400 });
    }

    // Upsert the read record
    const { error } = await supabaseAdmin
      .from('user_report_reads')
      .upsert({
        user_id: currentUser.id,
        report_id: report_id,
        last_read_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,report_id'
      });

    if (error) {
      console.error('Error marking report as read:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
