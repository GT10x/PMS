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
      .select('id, name')
      .eq('api_key', apiKey)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Parse body
    const body = await req.json();
    const {
      version_number,
      description,
      deploy_url,
      release_notes,
      git_commit,
      git_branch,
      deployed_by
    } = body;

    if (!version_number) {
      return NextResponse.json({ error: 'version_number is required' }, { status: 400 });
    }

    // Check if version already exists
    const { data: existingVersion } = await supabaseAdmin
      .from('project_versions')
      .select('id')
      .eq('project_id', project.id)
      .eq('version_number', version_number)
      .single();

    if (existingVersion) {
      // Update existing version
      const { data: updatedVersion, error: updateError } = await supabaseAdmin
        .from('project_versions')
        .update({
          description: description || undefined,
          release_date: new Date().toISOString(),
          status: 'testing'
        })
        .eq('id', existingVersion.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Update project deploy_url
      if (deploy_url) {
        await supabaseAdmin
          .from('projects')
          .update({ deploy_url })
          .eq('id', project.id);
      }

      return NextResponse.json({
        message: 'Version updated',
        version: updatedVersion,
        project_name: project.name,
        pms_url: `https://pms.globaltechtrums.com/dashboard/project/${project.id}/versions`
      });
    }

    // Get project owner or first admin for created_by
    const { data: projectOwner } = await supabaseAdmin
      .from('project_members')
      .select('user_id')
      .eq('project_id', project.id)
      .limit(1)
      .single();

    let createdBy = projectOwner?.user_id;

    // Fallback to first admin if no project member found
    if (!createdBy) {
      const { data: admin } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('is_admin', true)
        .limit(1)
        .single();
      createdBy = admin?.id;
    }

    // Create new version
    const { data: version, error: versionError } = await supabaseAdmin
      .from('project_versions')
      .insert({
        project_id: project.id,
        version_number,
        description: description || `Deployed version ${version_number}`,
        release_date: new Date().toISOString(),
        status: 'testing',
        created_by: createdBy
      })
      .select()
      .single();

    if (versionError) {
      return NextResponse.json({ error: versionError.message }, { status: 500 });
    }

    // Update project deploy_url
    if (deploy_url) {
      await supabaseAdmin
        .from('projects')
        .update({ deploy_url })
        .eq('id', project.id);
    }

    return NextResponse.json({
      message: 'Version registered successfully',
      version,
      project_name: project.name,
      pms_url: `https://pms.globaltechtrums.com/dashboard/project/${project.id}/versions`
    }, { status: 201 });

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

    // Get latest version
    const { data: latestVersion } = await supabaseAdmin
      .from('project_versions')
      .select('version_number, status, release_date')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      project: project.name,
      project_id: project.id,
      deploy_url: project.deploy_url,
      latest_version: latestVersion || null,
      pms_url: `https://pms.globaltechtrums.com/dashboard/project/${project.id}`
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
