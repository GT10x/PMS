// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// Get current user from cookie
async function getCurrentUser() {
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

  return data;
}

// GET /api/projects/[id]/api-key - Get API key for project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin/PM can view API keys
    if (!currentUser.is_admin && currentUser.role !== 'project_manager') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id: projectId } = await params;

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .select('id, name, api_key, deploy_url')
      .eq('id', projectId)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      project_id: project.id,
      project_name: project.name,
      api_key: project.api_key,
      deploy_url: project.deploy_url,
      integration_endpoint: 'https://pms-lime-two.vercel.app/api/integrations/register-version'
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects/[id]/api-key - Generate new API key
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin/PM can generate API keys
    if (!currentUser.is_admin && currentUser.role !== 'project_manager') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id: projectId } = await params;

    // Generate a secure API key
    const apiKey = `pms_${crypto.randomBytes(32).toString('hex')}`;

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .update({ api_key: apiKey })
      .eq('id', projectId)
      .select('id, name, api_key')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'API key generated successfully',
      project_id: project.id,
      project_name: project.name,
      api_key: project.api_key,
      integration_endpoint: 'https://pms-lime-two.vercel.app/api/integrations/register-version',
      usage_example: `curl -X POST https://pms-lime-two.vercel.app/api/integrations/register-version \\
  -H "x-api-key: ${project.api_key}" \\
  -H "Content-Type: application/json" \\
  -d '{"version_number": "1.0.0", "description": "Initial release", "deploy_url": "https://your-app.vercel.app"}'`
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/api-key - Revoke API key
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can revoke API keys
    if (!currentUser.is_admin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id: projectId } = await params;

    const { error } = await supabaseAdmin
      .from('projects')
      .update({ api_key: null })
      .eq('id', projectId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'API key revoked' });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
