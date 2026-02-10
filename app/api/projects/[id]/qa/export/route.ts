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

// GET /api/projects/[id]/qa/export - Export all answered questions as JSON
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

    let exportQuery = supabaseAdmin
      .from('qa_questions')
      .select(`
        *,
        assigned_user:user_profiles!qa_questions_assigned_to_fkey(id, full_name, role)
      `)
      .eq('project_id', projectId)
      .eq('answer_status', 'answered')
      .order('topic', { ascending: true })
      .order('sort_order', { ascending: true });

    // Non-admin only sees their own answered questions
    if (!currentUser.is_admin) {
      exportQuery = exportQuery.eq('assigned_to', currentUser.id);
    }

    const { data: questions, error } = await exportQuery;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(JSON.stringify(questions || [], null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="qa-answers-export.json"',
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
