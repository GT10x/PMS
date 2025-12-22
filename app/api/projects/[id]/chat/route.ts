// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

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

// Check if user has access to project
async function hasProjectAccess(userId: string, projectId: string, isAdmin: boolean) {
  if (isAdmin) return true;

  const { data } = await supabaseAdmin
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();

  return !!data;
}

// GET /api/projects/[id]/chat - Get chat messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Check access
    const hasAccess = await hasProjectAccess(currentUser.id, projectId, currentUser.is_admin);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get query params for pagination
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // cursor for pagination

    // Build query
    let query = supabaseAdmin
      .from('chat_messages')
      .select(`
        *,
        sender:user_profiles!sender_id(id, full_name, username, role),
        reply_to:chat_messages!reply_to_id(
          id,
          content,
          sender:user_profiles!sender_id(id, full_name)
        ),
        reactions:chat_reactions(
          id,
          emoji,
          user:user_profiles!user_id(id, full_name)
        )
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get project members for mentions
    const { data: members } = await supabaseAdmin
      .from('project_members')
      .select(`
        user:user_profiles!user_id(id, full_name, username, role)
      `)
      .eq('project_id', projectId);

    // Reverse to show oldest first
    const sortedMessages = (messages || []).reverse();

    return NextResponse.json({
      messages: sortedMessages,
      members: members?.map(m => m.user) || [],
      hasMore: (messages?.length || 0) === limit
    });
  } catch (error) {
    console.error('Error in GET /chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects/[id]/chat - Send a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Check access
    const hasAccess = await hasProjectAccess(currentUser.id, projectId, currentUser.is_admin);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const { content, message_type = 'text', attachment_url, reply_to_id, mentions = [] } = body;

    // Validate
    if (!content && !attachment_url) {
      return NextResponse.json({ error: 'Message content or attachment required' }, { status: 400 });
    }

    // Insert message
    const { data: message, error } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        project_id: projectId,
        sender_id: currentUser.id,
        content,
        message_type,
        attachment_url,
        reply_to_id,
        mentions
      })
      .select(`
        *,
        sender:user_profiles!sender_id(id, full_name, username, role),
        reply_to:chat_messages!reply_to_id(
          id,
          content,
          sender:user_profiles!sender_id(id, full_name)
        ),
        reactions:chat_reactions(
          id,
          emoji,
          user:user_profiles!user_id(id, full_name)
        )
      `)
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error in POST /chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
