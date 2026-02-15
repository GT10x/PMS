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

// POST /api/contacts/[id]/attachments - Add attachment
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

    const { file_url, label } = await req.json();
    if (!file_url) {
      return NextResponse.json({ error: 'File URL required' }, { status: 400 });
    }

    const { data: attachment, error } = await supabaseAdmin
      .from('contact_attachments')
      .insert({ contact_id: id, file_url, label })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    console.error('Error creating attachment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
