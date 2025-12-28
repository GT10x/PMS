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

// POST /api/projects/[id]/test-webhook - Send a test webhook
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { webhook_url } = body;

    if (!webhook_url) {
      return NextResponse.json({ error: 'webhook_url is required' }, { status: 400 });
    }

    // Get project info
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id, name')
      .eq('id', id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Send test webhook
    try {
      const response = await fetch(webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'test',
          project_id: project.id,
          project_name: project.name,
          message: 'This is a test webhook from PMS',
          sent_at: new Date().toISOString(),
          sent_by: currentUser.full_name || currentUser.email
        })
      });

      if (!response.ok) {
        return NextResponse.json({
          error: `Webhook returned status ${response.status}`,
          status_code: response.status
        }, { status: 400 });
      }

      return NextResponse.json({
        message: 'Test webhook sent successfully',
        status_code: response.status
      });
    } catch (fetchError) {
      return NextResponse.json({
        error: `Failed to reach webhook URL: ${fetchError.message}`
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
