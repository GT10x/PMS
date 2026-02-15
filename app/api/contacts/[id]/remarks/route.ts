// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

const MASTER_ADMIN_ID = 'd60a4c5e-aa9f-4cdb-999a-41f0bd23d09e';

async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;
  if (!userId) return null;
  const { data } = await supabaseAdmin.from('user_profiles').select('*').eq('id', userId).single();
  return data;
}

// POST /api/contacts/[id]/remarks - Add remark
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.id !== MASTER_ADMIN_ID) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { content, voice_url } = await req.json();
    if (!content && !voice_url) {
      return NextResponse.json({ error: 'Content or voice URL required' }, { status: 400 });
    }

    const { data: remark, error } = await supabaseAdmin
      .from('contact_remarks')
      .insert({ contact_id: id, content, voice_url })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ remark }, { status: 201 });
  } catch (error) {
    console.error('Error creating remark:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
