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

// GET /api/projects/[id]/qa - List all Q&A questions
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const assignedTo = url.searchParams.get('assigned_to');
    const topic = url.searchParams.get('topic');
    const priority = url.searchParams.get('priority');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    let query = supabaseAdmin
      .from('qa_questions')
      .select(`
        *,
        assigned_user:user_profiles!qa_questions_assigned_to_fkey(id, full_name, role)
      `)
      .eq('project_id', projectId)
      .order('topic', { ascending: true })
      .order('sort_order', { ascending: true });

    // Non-admin users can ONLY see their own assigned questions
    if (!currentUser.is_admin) {
      query = query.eq('assigned_to', currentUser.id);
    } else if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }

    if (topic) query = query.eq('topic', topic);
    if (priority) query = query.eq('priority', priority);
    if (status) query = query.eq('answer_status', status);
    if (search) query = query.ilike('question_text', `%${search}%`);

    const { data: questions, error } = await query;

    if (error) {
      console.error('Error fetching Q&A:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ questions: questions || [] });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects/[id]/qa - Create question(s) - bulk insert supported
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!currentUser.is_admin) {
      return NextResponse.json({ error: 'Only admin can create questions' }, { status: 403 });
    }

    const body = await req.json();
    const questionsInput = body.questions || [body];

    // Resolve parent_question_id references (string question_id → UUID)
    const parentRefs = questionsInput
      .filter((q: any) => q.parent_question_id && typeof q.parent_question_id === 'string' && q.parent_question_id.length < 20)
      .map((q: any) => q.parent_question_id);

    let parentMap: Record<string, string> = {};
    if (parentRefs.length > 0) {
      const { data: parents } = await supabaseAdmin
        .from('qa_questions')
        .select('id, question_id')
        .eq('project_id', projectId)
        .in('question_id', parentRefs);
      if (parents) {
        for (const p of parents) {
          parentMap[p.question_id] = p.id;
        }
      }
    }

    const inserts = questionsInput.map((q: any) => {
      let parentId = null;
      if (q.parent_question_id) {
        parentId = parentMap[q.parent_question_id] || q.parent_question_id;
        // If still not a UUID, set null
        if (parentId && parentId.length < 20) parentId = null;
      }

      return {
        project_id: projectId,
        question_id: q.question_id,
        question_text: q.question_text,
        topic: q.topic,
        priority: q.priority || 'should',
        assigned_to: q.assigned_to || null,
        context: q.context || null,
        cto_response: q.cto_response || null,
        answer_text: q.answer_text || null,
        answer_status: q.answer_status || 'pending',
        deferred_to: q.deferred_to || null,
        deferred_note: q.deferred_note || null,
        parent_question_id: parentId,
        round: q.round || null,
        sort_order: q.sort_order || 0,
        answered_at: q.answer_status === 'answered' ? new Date().toISOString() : null,
      };
    });

    const { data, error } = await supabaseAdmin
      .from('qa_questions')
      .insert(inserts)
      .select();

    if (error) {
      console.error('Error creating questions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ questions: data }, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
