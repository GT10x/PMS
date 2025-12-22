const fs = require('fs');
const path = require('path');

const content = `// @ts-nocheck
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
    const before = searchParams.get('before');

    // Fetch messages
    let query = supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: rawMessages, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get unique sender IDs
    const senderIds = [...new Set((rawMessages || []).map(m => m.sender_id))];
    const replyIds = (rawMessages || []).filter(m => m.reply_to_id).map(m => m.reply_to_id);
    const messageIds = (rawMessages || []).map(m => m.id);

    // Fetch senders
    const senderMap = new Map();
    if (senderIds.length > 0) {
      const { data: senders } = await supabaseAdmin
        .from('user_profiles')
        .select('id, full_name, username, role')
        .in('id', senderIds);
      senders?.forEach(s => senderMap.set(s.id, s));
    }

    // Fetch reply-to messages
    const replyMap = new Map();
    if (replyIds.length > 0) {
      const { data: replies } = await supabaseAdmin
        .from('chat_messages')
        .select('id, content, sender_id')
        .in('id', replyIds);
      replies?.forEach(r => {
        replyMap.set(r.id, {
          id: r.id,
          content: r.content,
          sender: senderMap.get(r.sender_id) || { id: r.sender_id, full_name: 'Unknown' }
        });
      });
    }

    // Fetch reactions
    const reactionsMap = new Map();
    if (messageIds.length > 0) {
      const { data: reactions } = await supabaseAdmin
        .from('chat_reactions')
        .select('id, message_id, emoji, user_id')
        .in('message_id', messageIds);
      reactions?.forEach(r => {
        if (!reactionsMap.has(r.message_id)) {
          reactionsMap.set(r.message_id, []);
        }
        reactionsMap.get(r.message_id).push({
          id: r.id,
          emoji: r.emoji,
          user: senderMap.get(r.user_id) || { id: r.user_id, full_name: 'Unknown' }
        });
      });
    }

    // Combine data
    const messages = (rawMessages || []).map(m => ({
      ...m,
      sender: senderMap.get(m.sender_id) || { id: m.sender_id, full_name: 'Unknown', role: 'user' },
      reply_to: m.reply_to_id ? replyMap.get(m.reply_to_id) || null : null,
      reactions: reactionsMap.get(m.id) || []
    }));

    // Get project members for mentions
    const { data: members } = await supabaseAdmin
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId);

    const memberIds = members?.map(m => m.user_id) || [];
    let membersList = [];
    if (memberIds.length > 0) {
      const { data: memberUsers } = await supabaseAdmin
        .from('user_profiles')
        .select('id, full_name, username, role')
        .in('id', memberIds);
      membersList = memberUsers || [];
    }

    // Reverse to show oldest first
    const sortedMessages = messages.reverse();

    return NextResponse.json({
      messages: sortedMessages,
      members: membersList,
      hasMore: (rawMessages?.length || 0) === limit
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
    const { data: newMessage, error } = await supabaseAdmin
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
      .select('*')
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch sender info
    const { data: sender } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, username, role')
      .eq('id', currentUser.id)
      .single();

    // Fetch reply_to if exists
    let reply_to = null;
    if (reply_to_id) {
      const { data: replyMsg } = await supabaseAdmin
        .from('chat_messages')
        .select('id, content, sender_id')
        .eq('id', reply_to_id)
        .single();

      if (replyMsg) {
        const { data: replySender } = await supabaseAdmin
          .from('user_profiles')
          .select('id, full_name')
          .eq('id', replyMsg.sender_id)
          .single();

        reply_to = {
          id: replyMsg.id,
          content: replyMsg.content,
          sender: replySender || { id: replyMsg.sender_id, full_name: 'Unknown' }
        };
      }
    }

    // Build response
    const message = {
      ...newMessage,
      sender: sender || { id: currentUser.id, full_name: 'Unknown', role: 'user' },
      reply_to,
      reactions: []
    };

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error in POST /chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
`;

const targetPath = path.join(__dirname, 'app/api/projects/[id]/chat/route.ts');
fs.writeFileSync(targetPath, content, 'utf8');
console.log('File updated successfully!');
