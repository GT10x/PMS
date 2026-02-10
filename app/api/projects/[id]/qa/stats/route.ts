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

// GET /api/projects/[id]/qa/stats - Dashboard stats
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

    let statsQuery = supabaseAdmin
      .from('qa_questions')
      .select(`
        id, answer_status, topic, priority, assigned_to,
        assigned_user:user_profiles!qa_questions_assigned_to_fkey(id, full_name)
      `)
      .eq('project_id', projectId);

    // Non-admin users only see their own stats
    if (!currentUser.is_admin) {
      statsQuery = statsQuery.eq('assigned_to', currentUser.id);
    }

    const { data: questions, error } = await statsQuery;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const all = questions || [];
    const total = all.length;
    const answered = all.filter(q => q.answer_status === 'answered').length;
    const pending = all.filter(q => q.answer_status === 'pending').length;
    const deferred = all.filter(q => q.answer_status === 'deferred').length;
    const follow_up = all.filter(q => q.answer_status === 'follow_up').length;

    // By assignee
    const assigneeMap: Record<string, { user_id: string; full_name: string; total: number; answered: number }> = {};
    for (const q of all) {
      if (!q.assigned_to) continue;
      if (!assigneeMap[q.assigned_to]) {
        assigneeMap[q.assigned_to] = {
          user_id: q.assigned_to,
          full_name: q.assigned_user?.full_name || 'Unknown',
          total: 0,
          answered: 0,
        };
      }
      assigneeMap[q.assigned_to].total++;
      if (q.answer_status === 'answered') assigneeMap[q.assigned_to].answered++;
    }

    // By topic
    const topicMap: Record<string, { topic: string; total: number; answered: number }> = {};
    for (const q of all) {
      if (!topicMap[q.topic]) {
        topicMap[q.topic] = { topic: q.topic, total: 0, answered: 0 };
      }
      topicMap[q.topic].total++;
      if (q.answer_status === 'answered') topicMap[q.topic].answered++;
    }

    // By priority
    const by_priority: Record<string, { total: number; answered: number }> = {
      must: { total: 0, answered: 0 },
      should: { total: 0, answered: 0 },
      nice: { total: 0, answered: 0 },
    };
    for (const q of all) {
      if (by_priority[q.priority]) {
        by_priority[q.priority].total++;
        if (q.answer_status === 'answered') by_priority[q.priority].answered++;
      }
    }

    return NextResponse.json({
      total,
      answered,
      pending,
      deferred,
      follow_up,
      by_assignee: Object.values(assigneeMap),
      by_topic: Object.values(topicMap).sort((a, b) => b.total - a.total),
      by_priority,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
