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

// DELETE /api/contacts/[id]/remarks/[remarkId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; remarkId: string }> }
) {
  try {
    const { remarkId } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.id !== MASTER_ADMIN_ID) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabaseAdmin.from('contact_remarks').delete().eq('id', remarkId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting remark:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
