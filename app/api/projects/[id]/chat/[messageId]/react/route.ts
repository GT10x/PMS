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

// POST /api/projects/[id]/chat/[messageId]/react - Add reaction
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params;
    const body = await req.json();
    const { emoji } = body;

    if (!emoji) {
      return NextResponse.json({ error: 'Emoji required' }, { status: 400 });
    }

    // Check if reaction already exists
    const { data: existing } = await supabaseAdmin
      .from('chat_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', currentUser.id)
      .eq('emoji', emoji)
      .single();

    if (existing) {
      // Remove the reaction (toggle)
      await supabaseAdmin
        .from('chat_reactions')
        .delete()
        .eq('id', existing.id);

      return NextResponse.json({ action: 'removed', emoji });
    }

    // Add new reaction
    const { data: reaction, error } = await supabaseAdmin
      .from('chat_reactions')
      .insert({
        message_id: messageId,
        user_id: currentUser.id,
        emoji
      })
      .select(`
        id,
        emoji,
        user:user_profiles!user_id(id, full_name)
      `)
      .single();

    if (error) {
      console.error('Error adding reaction:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ action: 'added', reaction });
  } catch (error) {
    console.error('Error in POST /react:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/chat/[messageId]/react - Remove reaction
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params;
    const { searchParams } = new URL(req.url);
    const emoji = searchParams.get('emoji');

    if (!emoji) {
      return NextResponse.json({ error: 'Emoji required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('chat_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', currentUser.id)
      .eq('emoji', emoji);

    if (error) {
      console.error('Error removing reaction:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /react:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
