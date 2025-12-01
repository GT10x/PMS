// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { User } from '@/lib/types';

// Get current user from cookie
async function getCurrentUser(request: NextRequest): Promise<User | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  if (!userId) {
    return null;
  }

  const { data } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return data as User | null;
}

// GET /api/projects/[id]/reports/[reportId] - Get a single report
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
    const currentUser = await getCurrentUser(req);

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, reportId } = await params;

    // Check access
    const isAdminOrPM = currentUser.is_admin || currentUser.role === 'project_manager';

    if (!isAdminOrPM) {
      const { data: membership } = await supabaseAdmin
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', currentUser.id)
        .single();

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Get report with relations
    const { data: report, error } = await supabaseAdmin
      .from('project_reports')
      .select(`
        *,
        reported_by_user:user_profiles!project_reports_reported_by_fkey(id, full_name, email),
        assigned_to_user:user_profiles!project_reports_assigned_to_fkey(id, full_name, email),
        version:project_versions(id, version_number, description)
      `)
      .eq('id', reportId)
      .eq('project_id', projectId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/projects/[id]/reports/[reportId] - Update a report
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
    const currentUser = await getCurrentUser(req);

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, reportId } = await params;
    const body = await req.json();

    // Get the existing report
    const { data: existingReport } = await supabaseAdmin
      .from('project_reports')
      .select('reported_by, project_id')
      .eq('id', reportId)
      .single();

    if (!existingReport || existingReport.project_id !== projectId) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Check permissions
    const isAdminOrPM = currentUser.is_admin || currentUser.role === 'project_manager';
    const isReporter = existingReport.reported_by === currentUser.id;

    // Only admin/PM can update status, assign, and add dev notes
    // Reporters can only update their own reports (title, description, etc.)
    if (!isAdminOrPM && !isReporter) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const updateData: any = {};

    // Fields that only admin/PM can update
    if (isAdminOrPM) {
      if (body.status) updateData.status = body.status;
      if (body.assigned_to !== undefined) updateData.assigned_to = body.assigned_to;
      if (body.dev_notes !== undefined) updateData.dev_notes = body.dev_notes;
      if (body.priority) updateData.priority = body.priority;
    }

    // Fields that reporter can update
    if (isReporter || isAdminOrPM) {
      if (body.title) updateData.title = body.title;
      if (body.description) updateData.description = body.description;
      if (body.type) updateData.type = body.type;
      if (body.attachments) updateData.attachments = body.attachments;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Update report
    const { data: report, error } = await supabaseAdmin
      .from('project_reports')
      .update(updateData)
      .eq('id', reportId)
      .select(`
        *,
        reported_by_user:user_profiles!project_reports_reported_by_fkey(id, full_name, email),
        assigned_to_user:user_profiles!project_reports_assigned_to_fkey(id, full_name, email),
        version:project_versions(id, version_number, description)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Error updating report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/reports/[reportId] - Delete a report
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
    const currentUser = await getCurrentUser(req);

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, reportId } = await params;

    // Only admin/PM can delete reports
    if (!currentUser.is_admin && currentUser.role !== 'project_manager') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('project_reports')
      .delete()
      .eq('id', reportId)
      .eq('project_id', projectId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
