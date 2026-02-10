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

// GET /api/projects/[id]/qa/[questionId] - Get single question with comments and children
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const { id: projectId, questionId } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: question, error } = await supabaseAdmin
      .from('qa_questions')
      .select(`
        *,
        assigned_user:user_profiles!qa_questions_assigned_to_fkey(id, full_name, role),
        deferred_from_user:user_profiles!qa_questions_deferred_from_fkey(id, full_name, role)
      `)
      .eq('id', questionId)
      .eq('project_id', projectId)
      .single();

    if (error || !question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Non-admin can only view their own assigned questions
    if (!currentUser.is_admin && question.assigned_to !== currentUser.id) {
      return NextResponse.json({ error: 'You can only view your own questions' }, { status: 403 });
    }

    // Get comments
    const { data: comments } = await supabaseAdmin
      .from('qa_comments')
      .select(`
        *,
        user:user_profiles!qa_comments_user_id_fkey(id, full_name, role)
      `)
      .eq('question_id', questionId)
      .order('created_at', { ascending: true });

    // Get follow-up questions (children)
    const { data: children } = await supabaseAdmin
      .from('qa_questions')
      .select(`
        *,
        assigned_user:user_profiles!qa_questions_assigned_to_fkey(id, full_name, role)
      `)
      .eq('parent_question_id', question.id)
      .order('sort_order', { ascending: true });

    return NextResponse.json({
      question: {
        ...question,
        comments: comments || [],
        children: children || [],
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/projects/[id]/qa/[questionId] - Update question (answer or CTO response)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const { id: projectId, questionId } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Get existing question
    const { data: existing } = await supabaseAdmin
      .from('qa_questions')
      .select('*')
      .eq('id', questionId)
      .eq('project_id', projectId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Permission check: admin can update anything, others only their own
    if (!currentUser.is_admin && existing.assigned_to !== currentUser.id) {
      return NextResponse.json({ error: 'You can only answer questions assigned to you' }, { status: 403 });
    }

    const updateData: any = {};

    // Answer fields
    if (body.answer_text !== undefined) updateData.answer_text = body.answer_text;
    if (body.answer_status !== undefined) updateData.answer_status = body.answer_status;
    if (body.answer_status === 'answered') updateData.answered_at = new Date().toISOString();

    // Defer fields — reassign to target person
    if (body.answer_status === 'deferred' && body.deferred_to) {
      updateData.deferred_from = existing.assigned_to; // track who deferred it
      updateData.assigned_to = body.deferred_to; // reassign to target
      updateData.deferred_to = body.deferred_to;
      if (body.deferred_note !== undefined) updateData.deferred_note = body.deferred_note;
    } else {
      if (body.deferred_to !== undefined) updateData.deferred_to = body.deferred_to;
      if (body.deferred_note !== undefined) updateData.deferred_note = body.deferred_note;
    }

    // CTO response (admin only)
    if (body.cto_response !== undefined) {
      if (!currentUser.is_admin) {
        return NextResponse.json({ error: 'Only admin can update CTO response' }, { status: 403 });
      }
      updateData.cto_response = body.cto_response;
    }

    const { data: updated, error } = await supabaseAdmin
      .from('qa_questions')
      .update(updateData)
      .eq('id', questionId)
      .select(`
        *,
        assigned_user:user_profiles!qa_questions_assigned_to_fkey(id, full_name, role),
        deferred_from_user:user_profiles!qa_questions_deferred_from_fkey(id, full_name, role)
      `)
      .single();

    if (error) {
      console.error('Error updating question:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ question: updated });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
