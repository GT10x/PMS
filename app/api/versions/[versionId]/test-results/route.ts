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

// GET /api/versions/[versionId]/test-results
// Get all test cases and results for a version
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { versionId } = await params;

    // Get version with project info
    const { data: version, error: versionError } = await supabaseAdmin
      .from('project_versions')
      .select(`
        *,
        project:projects(id, name)
      `)
      .eq('id', versionId)
      .single();

    if (versionError || !version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Get changes
    const { data: changes } = await supabaseAdmin
      .from('version_changes')
      .select('*')
      .eq('version_id', versionId)
      .order('sort_order', { ascending: true });

    // Get known issues
    const { data: knownIssues } = await supabaseAdmin
      .from('version_known_issues')
      .select('*')
      .eq('version_id', versionId);

    // Get test cases with results
    const { data: testCases } = await supabaseAdmin
      .from('version_test_cases')
      .select(`
        *,
        version_test_results (*)
      `)
      .eq('version_id', versionId)
      .order('sort_order', { ascending: true });

    return NextResponse.json({
      version,
      changes: changes || [],
      known_issues: knownIssues || [],
      test_cases: testCases || []
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/versions/[versionId]/test-results
// Update test result for a specific test case
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { versionId } = await params;
    const body = await req.json();
    const { test_case_id, status, notes, attachments } = body;

    if (!test_case_id) {
      return NextResponse.json({ error: 'test_case_id is required' }, { status: 400 });
    }

    // Verify test case belongs to this version
    const { data: testCase } = await supabaseAdmin
      .from('version_test_cases')
      .select('id')
      .eq('id', test_case_id)
      .eq('version_id', versionId)
      .single();

    if (!testCase) {
      return NextResponse.json({ error: 'Test case not found' }, { status: 404 });
    }

    // Update or create test result
    const { data: existingResult } = await supabaseAdmin
      .from('version_test_results')
      .select('id')
      .eq('test_case_id', test_case_id)
      .single();

    const updateData = {
      status: status || 'pending',
      notes: notes || null,
      attachments: attachments || [],
      tester_id: currentUser.id,
      tested_at: status !== 'pending' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };

    if (existingResult) {
      const { error: updateError } = await supabaseAdmin
        .from('version_test_results')
        .update(updateData)
        .eq('id', existingResult.id);

      if (updateError) {
        console.error('Error updating test result:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('version_test_results')
        .insert({
          test_case_id,
          ...updateData
        });

      if (insertError) {
        console.error('Error inserting test result:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    // Update version tester info
    await supabaseAdmin
      .from('project_versions')
      .update({
        tester_id: currentUser.id,
        tested_at: new Date().toISOString()
      })
      .eq('id', versionId);

    return NextResponse.json({ message: 'Test result updated' });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/versions/[versionId]/test-results
// Request rebuild / submit final testing verdict
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { versionId } = await params;
    const body = await req.json();
    const { action, notes, final_status } = body;

    // Get version with webhook URL (check both version and project level)
    const { data: version } = await supabaseAdmin
      .from('project_versions')
      .select('*, project:projects(id, name, api_key, webhook_url)')
      .eq('id', versionId)
      .single();

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Use version-level webhook_url, fallback to project-level
    const webhookUrl = version.webhook_url || version.project?.webhook_url;

    if (action === 'request_rebuild') {
      // Fetch all test cases with results for detailed webhook
      const { data: testCases } = await supabaseAdmin
        .from('version_test_cases')
        .select(`
          id, title, description, steps,
          version_test_results (status, notes, attachments, tested_at)
        `)
        .eq('version_id', versionId)
        .order('sort_order', { ascending: true });

      // Mark version as needing rebuild
      await supabaseAdmin
        .from('project_versions')
        .update({
          rebuild_requested: true,
          rebuild_requested_at: new Date().toISOString(),
          rebuild_notes: notes || 'Rebuild requested by tester',
          status: 'needs_fixes',
          tester_id: currentUser.id
        })
        .eq('id', versionId);

      // Call webhook if configured - send detailed payload
      if (webhookUrl) {
        try {
          // Build detailed test results for webhook
          const detailedResults = (testCases || []).map(tc => ({
            title: tc.title,
            description: tc.description,
            steps: tc.steps,
            status: tc.version_test_results?.[0]?.status || 'pending',
            tester_notes: tc.version_test_results?.[0]?.notes || null,
            attachments: tc.version_test_results?.[0]?.attachments || [],
            tested_at: tc.version_test_results?.[0]?.tested_at || null
          }));

          // Identify failing tests
          const failingTests = detailedResults.filter(t =>
            t.status === 'not_working' || t.status === 'partially_working' || t.status === 'failed'
          );

          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'rebuild_requested',
              project_id: version.project?.id,
              project_name: version.project?.name,
              version_id: versionId,
              version_number: version.version_number,
              rebuild_notes: notes || 'Rebuild requested by tester',
              requested_by: currentUser.full_name || currentUser.email,
              requested_at: new Date().toISOString(),
              test_summary: {
                total: detailedResults.length,
                passing: detailedResults.filter(t => t.status === 'properly_working' || t.status === 'passed').length,
                failing: failingTests.length,
                pending: detailedResults.filter(t => t.status === 'pending').length
              },
              failing_tests: failingTests,
              all_test_results: detailedResults,
              pms_url: `https://pms.globaltechtrums.com/dashboard/project/${version.project?.id}/versions/${versionId}`,
              feedback_api: `https://pms.globaltechtrums.com/api/integrations/version-feedback/${versionId}`
            })
          });
        } catch (webhookError) {
          console.error('Webhook call failed:', webhookError);
        }
      }

      return NextResponse.json({
        message: 'Rebuild requested',
        status: 'needs_fixes',
        webhook_sent: !!webhookUrl,
        webhook_url: webhookUrl ? 'configured' : 'not configured'
      });

    } else if (action === 'approve') {
      // Mark version as approved/released
      const { error: approveError } = await supabaseAdmin
        .from('project_versions')
        .update({
          status: final_status || 'released',
          tester_id: currentUser.id,
          tested_at: new Date().toISOString()
        })
        .eq('id', versionId);

      if (approveError) {
        console.error('Error approving version:', approveError);
        return NextResponse.json({ error: approveError.message }, { status: 500 });
      }

      // Call webhook if configured
      if (version.webhook_url) {
        try {
          await fetch(version.webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'version_approved',
              version_id: versionId,
              version_number: version.version_number,
              project_name: version.project?.name,
              approved_by: currentUser.full_name || currentUser.email
            })
          });
        } catch (webhookError) {
          console.error('Webhook call failed:', webhookError);
        }
      }

      return NextResponse.json({
        message: 'Version approved',
        status: final_status || 'released'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
