// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/integrations/version-feedback/[versionId]
// Called by int-video to fetch tester feedback for a version
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
) {
  try {
    const apiKey = req.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    // Verify API key
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id, name')
      .eq('api_key', apiKey)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const { versionId } = await params;

    // Get version details
    const { data: version, error: versionError } = await supabaseAdmin
      .from('project_versions')
      .select('*')
      .eq('id', versionId)
      .eq('project_id', project.id)
      .single();

    if (versionError || !version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Get tester info if assigned
    let testerInfo = null;
    if (version.tester_id) {
      const { data: tester } = await supabaseAdmin
        .from('user_profiles')
        .select('id, full_name, email')
        .eq('id', version.tester_id)
        .single();
      testerInfo = tester;
    }

    // Get test cases with results
    const { data: testCases } = await supabaseAdmin
      .from('version_test_cases')
      .select(`
        id,
        title,
        description,
        steps,
        sort_order,
        version_test_results (
          id,
          status,
          notes,
          attachments,
          tested_at,
          tester_id
        )
      `)
      .eq('version_id', versionId)
      .order('sort_order', { ascending: true });

    // Calculate overall test status
    let overallStatus = 'pending';
    if (testCases && testCases.length > 0) {
      const results = testCases.map(tc => tc.version_test_results?.[0]?.status || 'pending');
      const hasFailures = results.some(s => s === 'failed');
      const allPassed = results.every(s => s === 'passed');
      const allTested = results.every(s => s !== 'pending');

      if (hasFailures) overallStatus = 'failed';
      else if (allPassed) overallStatus = 'passed';
      else if (allTested) overallStatus = 'completed';
      else overallStatus = 'in_progress';
    }

    // Format test results for response
    const formattedTestResults = testCases?.map(tc => ({
      test_case_id: tc.id,
      title: tc.title,
      description: tc.description,
      steps: tc.steps,
      status: tc.version_test_results?.[0]?.status || 'pending',
      tester_notes: tc.version_test_results?.[0]?.notes || null,
      attachments: tc.version_test_results?.[0]?.attachments || [],
      tested_at: tc.version_test_results?.[0]?.tested_at || null
    })) || [];

    return NextResponse.json({
      version_id: version.id,
      version_number: version.version_number,
      release_title: version.release_title,
      status: version.status,
      overall_test_status: overallStatus,
      rebuild_requested: version.rebuild_requested || false,
      rebuild_notes: version.rebuild_notes || null,
      rebuild_requested_at: version.rebuild_requested_at || null,
      tester: testerInfo,
      tested_at: version.tested_at,
      test_results: formattedTestResults,
      summary: {
        total_tests: formattedTestResults.length,
        passed: formattedTestResults.filter(t => t.status === 'passed').length,
        failed: formattedTestResults.filter(t => t.status === 'failed').length,
        pending: formattedTestResults.filter(t => t.status === 'pending').length,
        blocked: formattedTestResults.filter(t => t.status === 'blocked').length
      }
    });

  } catch (error) {
    console.error('Error fetching version feedback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/integrations/version-feedback/[versionId]
// Mark version as addressed (after int-video fixes issues)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
) {
  try {
    const apiKey = req.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('api_key', apiKey)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const { versionId } = await params;
    const body = await req.json();
    const { action, message } = body;

    if (action === 'acknowledge_rebuild') {
      // Int-video acknowledges the rebuild request
      await supabaseAdmin
        .from('project_versions')
        .update({
          rebuild_requested: false,
          status: 'in_development'
        })
        .eq('id', versionId)
        .eq('project_id', project.id);

      return NextResponse.json({
        message: 'Rebuild request acknowledged',
        status: 'in_development'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
