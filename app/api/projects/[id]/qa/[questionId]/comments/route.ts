// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

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

// POST /api/projects/[id]/qa/[questionId]/comments - Add comment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const { questionId } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { content, is_cto_response } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const { data: comment, error } = await supabaseAdmin
      .from('qa_comments')
      .insert({
        question_id: questionId,
        user_id: currentUser.id,
        content: content.trim(),
        is_cto_response: is_cto_response || false,
      })
      .select(`
        *,
        user:user_profiles!qa_comments_user_id_fkey(id, full_name, role)
      `)
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
