import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { sendPushToUsers } from '@/lib/firebase';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch all replies for a report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch replies with user info
    const { data: replies, error } = await supabase
      .from('report_replies')
      .select(`
        *,
        user:user_profiles!user_id (
          id,
          full_name,
          role
        )
      `)
      .eq('report_id', reportId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching replies:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ replies: replies || [] });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new reply
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, attachments = [] } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Reply content is required' }, { status: 400 });
    }

    // Get user info to determine role
    const { data: user } = await supabase
      .from('user_profiles')
      .select('role, is_admin')
      .eq('id', userId)
      .single();

    // Create the reply
    const { data: reply, error: replyError } = await supabase
      .from('report_replies')
      .insert({
        report_id: reportId,
        user_id: userId,
        content: content.trim(),
        attachments
      })
      .select(`
        *,
        user:user_profiles!user_id (
          id,
          full_name,
          role
        )
      `)
      .single();

    if (replyError) {
      console.error('Error creating reply:', replyError);
      return NextResponse.json({ error: replyError.message }, { status: 500 });
    }

    // Auto-update report status based on user role
    // Developer replies → status becomes 'in_progress'
    if (user && (user.role === 'developer' || user.role === 'react_native_developer')) {
      const { data: report } = await supabase
        .from('project_reports')
        .select('status')
        .eq('id', reportId)
        .single();

      // Only change to in_progress if currently open
      if (report && report.status === 'open') {
        await supabase
          .from('project_reports')
          .update({ status: 'in_progress' })
          .eq('id', reportId);
      }
    }

    // Send push notification to report creator and other participants
    (async () => {
      try {
        // Get report details including project info
        const { data: report } = await supabase
          .from('project_reports')
          .select('title, reported_by, project_id')
          .eq('id', reportId)
          .single();

        if (report) {
          // Get project name
          const { data: project } = await supabase
            .from('projects')
            .select('name')
            .eq('id', report.project_id)
            .single();

          // Get all users who have replied to this report
          const { data: allReplies } = await supabase
            .from('report_replies')
            .select('user_id')
            .eq('report_id', reportId);

          // Collect unique user IDs (reporter + all repliers)
          const userIds = new Set<string>();
          if (report.reported_by) userIds.add(report.reported_by);
          allReplies?.forEach(r => userIds.add(r.user_id));

          // Get replier's name
          const { data: replier } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('id', userId)
            .single();

          const replierName = replier?.full_name || 'Someone';
          const projectName = project?.name || 'a project';

          await sendPushToUsers(supabase, Array.from(userIds), {
            title: `Reply in ${projectName}`,
            body: `${replierName} replied to: ${report.title?.substring(0, 30)}`,
            data: {
              type: 'report_reply',
              reportId: reportId,
              projectId: report.project_id
            }
          }, userId);
        }
      } catch (e) {
        console.error('Push notification error:', e);
      }
    })();

    return NextResponse.json(reply);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
