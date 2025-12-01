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

// GET /api/projects/[id]/reports - Get all reports for a project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(req);

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Check if user has access to this project
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

    // Get query parameters for filtering
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get('status');
    const typeFilter = url.searchParams.get('type');
    const versionFilter = url.searchParams.get('version_id');

    // Build query
    let query = supabaseAdmin
      .from('project_reports')
      .select(`
        *,
        reported_by_user:user_profiles!project_reports_reported_by_fkey(id, full_name, email),
        assigned_to_user:user_profiles!project_reports_assigned_to_fkey(id, full_name, email),
        version:project_versions(id, version_number, description)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    if (typeFilter && typeFilter !== 'all') {
      query = query.eq('type', typeFilter);
    }

    if (versionFilter && versionFilter !== 'all') {
      query = query.eq('version_id', versionFilter);
    }

    const { data: reports, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects/[id]/reports - Create a new report
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(req);

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Check if user has access to this project
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

    const body = await req.json();
    const {
      title,
      description,
      type,
      priority,
      browser,
      device,
      attachments,
      version_id
    } = body;

    // Validate required fields
    if (!title || !description || !type) {
      return NextResponse.json(
        { error: 'Title, description, and type are required' },
        { status: 400 }
      );
    }

    // Create report
    const { data: report, error } = await supabaseAdmin
      .from('project_reports')
      .insert({
        project_id: projectId,
        title,
        description,
        type,
        priority: priority || 'medium',
        status: 'open',
        browser,
        device,
        reported_by: currentUser.id,
        attachments: attachments || [],
        version_id: version_id || null
      })
      .select(`
        *,
        reported_by_user:user_profiles!project_reports_reported_by_fkey(id, full_name, email)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
