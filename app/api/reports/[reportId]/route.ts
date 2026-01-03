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

// GET /api/reports/[reportId] - Get a single report
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportId } = await params;

    const { data: report, error } = await supabaseAdmin
      .from('project_reports')
      .select(`
        *,
        reported_by_user:user_profiles!project_reports_reported_by_fkey(id, full_name, email),
        assigned_to_user:user_profiles!project_reports_assigned_to_fkey(id, full_name, email),
        version:project_versions(id, version_number)
      `)
      .eq('id', reportId)
      .single();

    if (error || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/reports/[reportId] - Update a report (only by creator)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportId } = await params;

    // Get the report to check ownership
    const { data: existingReport } = await supabaseAdmin
      .from('project_reports')
      .select('reported_by, is_deleted')
      .eq('id', reportId)
      .single();

    if (!existingReport) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Check if user is the creator or admin
    if (existingReport.reported_by !== currentUser.id && !currentUser.is_admin) {
      return NextResponse.json({ error: 'Only the report creator can edit this report' }, { status: 403 });
    }

    // Cannot edit deleted reports
    if (existingReport.is_deleted) {
      return NextResponse.json({ error: 'Cannot edit a deleted report' }, { status: 400 });
    }

    const body = await req.json();
    const { title, description, type, priority, browser, device, attachments, status } = body;

    // Update the report
    const updateData: any = {
      edited_at: new Date().toISOString()
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (priority !== undefined) updateData.priority = priority;
    if (browser !== undefined) updateData.browser = browser;
    if (device !== undefined) updateData.device = device;
    if (attachments !== undefined) updateData.attachments = attachments;
    if (status !== undefined) updateData.status = status;

    const { data: report, error } = await supabaseAdmin
      .from('project_reports')
      .update(updateData)
      .eq('id', reportId)
      .select(`
        *,
        reported_by_user:user_profiles!project_reports_reported_by_fkey(id, full_name, email)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ report, message: 'Report updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/reports/[reportId] - Soft delete a report (only by creator)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportId } = await params;

    // Get the report to check ownership
    const { data: existingReport } = await supabaseAdmin
      .from('project_reports')
      .select('reported_by, is_deleted')
      .eq('id', reportId)
      .single();

    if (!existingReport) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Check if user is the creator or admin
    if (existingReport.reported_by !== currentUser.id && !currentUser.is_admin) {
      return NextResponse.json({ error: 'Only the report creator can delete this report' }, { status: 403 });
    }

    // Check if already deleted
    if (existingReport.is_deleted) {
      return NextResponse.json({ error: 'Report is already deleted' }, { status: 400 });
    }

    // Soft delete - mark as deleted
    const { error } = await supabaseAdmin
      .from('project_reports')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', reportId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
