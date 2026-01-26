import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

// Master Admin ID - only this user can delete any reply
const MASTER_ADMIN_ID = 'd60a4c5e-aa9f-4cdb-999a-41f0bd23d09e';

// PUT /api/remarks/[remarkId]/replies/[replyId] - Update a reply
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ remarkId: string; replyId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { remarkId, replyId } = await params;
    const body = await request.json();
    const { content, voice_url, image_url } = body;

    // Get the existing reply to check ownership
    const { data: existingReply, error: fetchError } = await (supabaseAdmin as any)
      .from('remark_replies')
      .select('*')
      .eq('id', replyId)
      .eq('remark_id', remarkId)
      .single();

    if (fetchError || !existingReply) {
      return NextResponse.json(
        { error: 'Reply not found' },
        { status: 404 }
      );
    }

    // Only the creator or master admin can edit
    if (existingReply.created_by !== userId && userId !== MASTER_ADMIN_ID) {
      return NextResponse.json(
        { error: 'You can only edit your own replies' },
        { status: 403 }
      );
    }

    // Update the reply
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (content !== undefined) updateData.content = content;
    if (voice_url !== undefined) updateData.voice_url = voice_url;
    if (image_url !== undefined) updateData.image_url = image_url;

    const { data: reply, error } = await (supabaseAdmin as any)
      .from('remark_replies')
      .update(updateData)
      .eq('id', replyId)
      .select(`
        *,
        created_by_user:user_profiles!remark_replies_created_by_fkey(id, full_name)
      `)
      .single();

    if (error) {
      console.error('Error updating reply:', error);
      return NextResponse.json(
        { error: 'Failed to update reply' },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Error in PUT reply:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/remarks/[remarkId]/replies/[replyId] - Delete a reply
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ remarkId: string; replyId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { remarkId, replyId } = await params;

    // Get the existing reply to check ownership
    const { data: existingReply, error: fetchError } = await (supabaseAdmin as any)
      .from('remark_replies')
      .select('*')
      .eq('id', replyId)
      .eq('remark_id', remarkId)
      .single();

    if (fetchError || !existingReply) {
      return NextResponse.json(
        { error: 'Reply not found' },
        { status: 404 }
      );
    }

    // Only the creator or master admin can delete
    if (existingReply.created_by !== userId && userId !== MASTER_ADMIN_ID) {
      return NextResponse.json(
        { error: 'You can only delete your own replies' },
        { status: 403 }
      );
    }

    const { error } = await (supabaseAdmin as any)
      .from('remark_replies')
      .delete()
      .eq('id', replyId);

    if (error) {
      console.error('Error deleting reply:', error);
      return NextResponse.json(
        { error: 'Failed to delete reply' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE reply:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
