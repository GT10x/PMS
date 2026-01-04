import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

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
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);

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
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    const body = await request.json();
    const { content, attachments = [] } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Reply content is required' }, { status: 400 });
    }

    // Get user info to determine role
    const { data: user } = await supabase
      .from('user_profiles')
      .select('role, is_admin')
      .eq('id', session.userId)
      .single();

    // Create the reply
    const { data: reply, error: replyError } = await supabase
      .from('report_replies')
      .insert({
        report_id: reportId,
        user_id: session.userId,
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

    return NextResponse.json(reply);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
