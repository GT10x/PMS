// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/integrations/register-version
// Called by external projects to register a new version after deployment
export async function POST(req: NextRequest) {
  try {
    // Get API key from header
    const apiKey = req.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    // Find project by API key
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, name, webhook_secret')
      .eq('api_key', apiKey)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Parse body
    const body = await req.json();
    const {
      version_number,
      release_title,
      release_summary,
      description,
      deploy_url,
      git_commit,
      git_branch,
      webhook_url,
      changes = [],        // Array of { type: 'feature'|'fix'|'improvement', title, description }
      known_issues = [],   // Array of { description, severity }
      test_cases = []      // Array of { title, description, steps: [] }
    } = body;

    if (!version_number) {
      return NextResponse.json({ error: 'version_number is required' }, { status: 400 });
    }

    // Get project owner or first admin for created_by
    const { data: projectOwner } = await supabaseAdmin
      .from('project_members')
      .select('user_id')
      .eq('project_id', project.id)
      .limit(1)
      .single();

    let createdBy = projectOwner?.user_id;

    if (!createdBy) {
      const { data: admin } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('is_admin', true)
        .limit(1)
        .single();
      createdBy = admin?.id;
    }

    // Check if version already exists
    const { data: existingVersion } = await supabaseAdmin
      .from('project_versions')
      .select('id')
      .eq('project_id', project.id)
      .eq('version_number', version_number)
      .single();

    let versionId: string;
    let isNewVersion = false;

    if (existingVersion) {
      // Update existing version
      const { data: updatedVersion, error: updateError } = await supabaseAdmin
        .from('project_versions')
        .update({
          release_title: release_title || undefined,
          release_summary: release_summary || undefined,
          description: description || undefined,
          deploy_url: deploy_url || undefined,
          git_commit: git_commit || undefined,
          git_branch: git_branch || undefined,
          webhook_url: webhook_url || undefined,
          release_date: new Date().toISOString(),
          status: 'testing',
          rebuild_requested: false,
          rebuild_requested_at: null
        })
        .eq('id', existingVersion.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      versionId = existingVersion.id;

      // Clear old changes, known_issues, test_cases for this version
      await supabaseAdmin.from('version_changes').delete().eq('version_id', versionId);
      await supabaseAdmin.from('version_known_issues').delete().eq('version_id', versionId);

      // Delete test results first (foreign key constraint)
      const { data: oldTestCases } = await supabaseAdmin
        .from('version_test_cases')
        .select('id')
        .eq('version_id', versionId);

      if (oldTestCases && oldTestCases.length > 0) {
        const testCaseIds = oldTestCases.map(tc => tc.id);
        await supabaseAdmin.from('version_test_results').delete().in('test_case_id', testCaseIds);
      }
      await supabaseAdmin.from('version_test_cases').delete().eq('version_id', versionId);

    } else {
      // Create new version
      const { data: newVersion, error: versionError } = await supabaseAdmin
        .from('project_versions')
        .insert({
          project_id: project.id,
          version_number,
          release_title: release_title || `Version ${version_number}`,
          release_summary: release_summary || '',
          description: description || `Deployed version ${version_number}`,
          deploy_url: deploy_url || null,
          git_commit: git_commit || null,
          git_branch: git_branch || null,
          webhook_url: webhook_url || null,
          release_date: new Date().toISOString(),
          status: 'testing',
          created_by: createdBy
        })
        .select()
        .single();

      if (versionError) {
        return NextResponse.json({ error: versionError.message }, { status: 500 });
      }

      versionId = newVersion.id;
      isNewVersion = true;
    }

    // Insert changes (features, fixes, etc.)
    if (changes.length > 0) {
      const changesData = changes.map((change: any, index: number) => ({
        version_id: versionId,
        change_type: change.type || 'feature',
        title: change.title,
        description: change.description || null,
        sort_order: index
      }));

      await supabaseAdmin.from('version_changes').insert(changesData);
    }

    // Insert known issues
    if (known_issues.length > 0) {
      const issuesData = known_issues.map((issue: any) => ({
        version_id: versionId,
        description: issue.description || issue,
        severity: issue.severity || 'low'
      }));

      await supabaseAdmin.from('version_known_issues').insert(issuesData);
    }

    // Insert test cases
    console.log(`Processing ${test_cases.length} test cases for version ${versionId}`);
    if (test_cases && test_cases.length > 0) {
      for (let i = 0; i < test_cases.length; i++) {
        const tc = test_cases[i];
        console.log(`Inserting test case ${i + 1}: ${tc.title}`);

        const { data: testCase, error: testCaseError } = await supabaseAdmin
          .from('version_test_cases')
          .insert({
            version_id: versionId,
            title: tc.title,
            description: tc.description || null,
            steps: tc.steps || [],
            sort_order: i,
            test_number: i + 1  // Add test_number for backward compatibility
          })
          .select()
          .single();

        if (testCaseError) {
          console.error(`Error inserting test case: ${testCaseError.message}`);
          continue;
        }

        console.log(`Test case inserted with id: ${testCase?.id}`);

        // Create empty test result for this test case
        if (testCase) {
          const { error: resultError } = await supabaseAdmin.from('version_test_results').insert({
            test_case_id: testCase.id,
            status: 'pending'
          });

          if (resultError) {
            console.error(`Error inserting test result: ${resultError.message}`);
          }
        }
      }
    }

    // Update project deploy_url
    if (deploy_url) {
      await supabaseAdmin
        .from('projects')
        .update({ deploy_url })
        .eq('id', project.id);
    }

    // Get the full version data
    const { data: fullVersion } = await supabaseAdmin
      .from('project_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    // Get counts for response
    const { count: testCaseCount } = await supabaseAdmin
      .from('version_test_cases')
      .select('*', { count: 'exact', head: true })
      .eq('version_id', versionId);

    const { count: changesCount } = await supabaseAdmin
      .from('version_changes')
      .select('*', { count: 'exact', head: true })
      .eq('version_id', versionId);

    return NextResponse.json({
      message: isNewVersion ? 'Version registered successfully' : 'Version updated successfully',
      version: fullVersion,
      version_id: versionId,
      project_name: project.name,
      project_id: project.id,
      pms_url: `https://pms.globaltechtrums.com/dashboard/project/${project.id}/versions/${versionId}`,
      feedback_url: `https://pms.globaltechtrums.com/api/integrations/version-feedback/${versionId}`,
      data_received: {
        changes: changes?.length || 0,
        known_issues: known_issues?.length || 0,
        test_cases: test_cases?.length || 0
      },
      data_stored: {
        changes: changesCount || 0,
        test_cases: testCaseCount || 0
      }
    }, { status: isNewVersion ? 201 : 200 });

  } catch (error) {
    console.error('Error registering version:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/integrations/register-version
// Get project info by API key (for verification)
export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .select('id, name, deploy_url')
      .eq('api_key', apiKey)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Get latest version with details
    const { data: latestVersion } = await supabaseAdmin
      .from('project_versions')
      .select(`
        id,
        version_number,
        release_title,
        status,
        release_date,
        rebuild_requested,
        rebuild_notes
      `)
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      project: project.name,
      project_id: project.id,
      deploy_url: project.deploy_url,
      latest_version: latestVersion || null,
      pms_url: `https://pms.globaltechtrums.com/dashboard/project/${project.id}`,
      needs_rebuild: latestVersion?.rebuild_requested || false,
      rebuild_notes: latestVersion?.rebuild_notes || null
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
