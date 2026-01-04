import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PATCH - Update report status
export async function PATCH(
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
    const { status } = body;

    const validStatuses = ['open', 'in_progress', 'resolved'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Get user info
    const { data: user } = await supabase
      .from('user_profiles')
      .select('id, full_name, role, is_admin')
      .eq('id', session.userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get report info
    const { data: report } = await supabase
      .from('project_reports')
      .select('reported_by, status')
      .eq('id', reportId)
      .single();

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const oldStatus = report.status;

    // Permission checks:
    // Open → In Progress: Only Developer, PM, CTO can change
    // In Progress → Resolved: Anyone can change (but it gets logged)
    const canChangeToInProgress =
      user.role === 'developer' ||
      user.role === 'react_native_developer' ||
      user.role === 'project_manager' ||
      user.role === 'cto' ||
      user.is_admin;

    let canChangeStatus = false;

    if (status === 'in_progress' && oldStatus === 'open') {
      // Only dev/pm/cto can change from open to in_progress
      canChangeStatus = canChangeToInProgress;
    } else if (status === 'resolved' && oldStatus === 'in_progress') {
      // Anyone can mark as resolved
      canChangeStatus = true;
    } else if (status === 'open') {
      // Only admin/pm can reopen
      canChangeStatus = user.is_admin || user.role === 'project_manager' || user.role === 'cto';
    } else if (status === 'in_progress' && oldStatus === 'resolved') {
      // Reopening from resolved - only dev/pm/cto
      canChangeStatus = canChangeToInProgress;
    }

    if (!canChangeStatus) {
      return NextResponse.json({
        error: status === 'in_progress'
          ? 'Only Developer, PM, or CTO can change status to In Progress'
          : 'You do not have permission to change this status'
      }, { status: 403 });
    }

    // Update the status
    const { data: updatedReport, error } = await supabase
      .from('project_reports')
      .update({ status })
      .eq('id', reportId)
      .select()
      .single();

    if (error) {
      console.error('Error updating status:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the status change
    await supabase
      .from('report_status_log')
      .insert({
        report_id: reportId,
        changed_by: user.id,
        old_status: oldStatus,
        new_status: status
      });

    return NextResponse.json({
      report: updatedReport,
      message: 'Status updated successfully',
      log: {
        changed_by: user.full_name,
        old_status: oldStatus,
        new_status: status,
        changed_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Get status change log for a report
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

    const { data: logs, error } = await supabase
      .from('report_status_log')
      .select(`
        *,
        user:user_profiles!changed_by (
          id,
          full_name,
          role
        )
      `)
      .eq('report_id', reportId)
      .order('changed_at', { ascending: true });

    if (error) {
      console.error('Error fetching status log:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs: logs || [] });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
