const fs = require('fs');
const filePath = 'C:/Users/PCS/pms/app/api/reports/[reportId]/status/route.ts';

const content = `import { NextRequest, NextResponse } from 'next/server';
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
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    const validStatuses = ['open', 'in_progress', 'do_qc', 'resolved', 'still_issue', 'wont_fix'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Get user info
    const { data: user } = await supabase
      .from('user_profiles')
      .select('id, full_name, role, is_admin')
      .eq('id', userId)
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

    // Super admin (is_admin) has no restrictions - can change any status
    let canChangeStatus = false;

    if (user.is_admin) {
      // Admin can do anything
      canChangeStatus = true;
    } else {
      // Permission checks for non-admin users:
      const canChangeToInProgress =
        user.role === 'developer' ||
        user.role === 'react_native_developer' ||
        user.role === 'project_manager' ||
        user.role === 'cto';

      const isTester = user.role === 'tester' || user.role === 'qa' || user.role === 'quality_assurance';
      const isDeveloper = user.role === 'developer' || user.role === 'react_native_developer';

      if (status === 'in_progress' && oldStatus === 'open') {
        // Only dev/pm/cto can change from open to in_progress
        canChangeStatus = canChangeToInProgress;
      } else if (status === 'do_qc' && oldStatus === 'in_progress') {
        // Only developer can mark as ready for QC
        canChangeStatus = isDeveloper;
      } else if ((status === 'resolved' || status === 'still_issue') && oldStatus === 'do_qc') {
        // Tester can mark as resolved or still_issue after QC
        canChangeStatus = isTester || isDeveloper || canChangeToInProgress;
      } else if (status === 'in_progress' && oldStatus === 'do_qc') {
        // Tester can send back to in_progress if QC fails (legacy)
        canChangeStatus = isTester || isDeveloper || canChangeToInProgress;
      } else if (status === 'in_progress' && oldStatus === 'still_issue') {
        // Developer can pick up a still_issue report
        canChangeStatus = isDeveloper || canChangeToInProgress;
      } else if (status === 'resolved' && oldStatus === 'in_progress') {
        // Developer can mark as resolved directly (skip QC)
        canChangeStatus = isDeveloper || canChangeToInProgress;
      } else if (status === 'open') {
        // Only pm/cto can reopen
        canChangeStatus = user.role === 'project_manager' || user.role === 'cto';
      } else if (status === 'in_progress' && oldStatus === 'resolved') {
        // Reopening from resolved - only dev/pm/cto
        canChangeStatus = canChangeToInProgress;
      } else if (status === 'wont_fix') {
        // Only pm/cto can mark as won't fix
        canChangeStatus = user.role === 'project_manager' || user.role === 'cto';
      }
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
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: logs, error } = await supabase
      .from('report_status_log')
      .select(\`
        *,
        user:user_profiles!changed_by (
          id,
          full_name,
          role
        )
      \`)
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
`;

fs.writeFileSync(filePath, content);
console.log('Updated status API with new permissions');
