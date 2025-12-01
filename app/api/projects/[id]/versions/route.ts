// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { User } from '@/lib/types';

async function getCurrentUser(request: NextRequest): Promise<User | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  if (!userId) return null;

  const { data } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return data as User | null;
}

// GET /api/projects/[id]/versions - Get all versions for a project
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

    // Get versions with test cases and results
    const { data: versions, error } = await supabaseAdmin
      .from('project_versions')
      .select(`
        *,
        test_cases:version_test_cases(
          *,
          results:test_results(*)
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ versions });
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects/[id]/versions - Create a new version
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin/PM can create versions
    if (!currentUser.is_admin && currentUser.role !== 'project_manager') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id: projectId } = await params;
    const body = await req.json();
    const { version_number, release_date, description, test_cases } = body;

    if (!version_number) {
      return NextResponse.json({ error: 'Version number is required' }, { status: 400 });
    }

    // Create version
    const { data: version, error: versionError } = await supabaseAdmin
      .from('project_versions')
      .insert({
        project_id: projectId,
        version_number,
        release_date: release_date || new Date().toISOString(),
        description,
        status: 'testing',
        created_by: currentUser.id
      })
      .select()
      .single();

    if (versionError) {
      return NextResponse.json({ error: versionError.message }, { status: 500 });
    }

    // Create test cases if provided
    if (test_cases && test_cases.length > 0) {
      const testCaseInserts = test_cases.map((tc: any, index: number) => ({
        version_id: version.id,
        test_number: index + 1,
        title: tc.title,
        instructions: tc.instructions,
        steps: tc.steps || []
      }));

      const { error: testCasesError } = await supabaseAdmin
        .from('version_test_cases')
        .insert(testCaseInserts);

      if (testCasesError) {
        console.error('Error creating test cases:', testCasesError);
      }
    }

    return NextResponse.json({ version }, { status: 201 });
  } catch (error) {
    console.error('Error creating version:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
