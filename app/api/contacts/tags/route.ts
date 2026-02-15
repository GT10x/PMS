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

// GET /api/contacts/tags - List all tags
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.id !== MASTER_ADMIN_ID) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: tags, error } = await supabaseAdmin
      .from('contact_tags')
      .select('*')
      .eq('created_by', MASTER_ADMIN_ID)
      .order('name');

    if (error) throw error;
    return NextResponse.json({ tags: tags || [] });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/contacts/tags - Create tag
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.id !== MASTER_ADMIN_ID) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, color } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Tag name required' }, { status: 400 });
    }

    const { data: tag, error } = await supabaseAdmin
      .from('contact_tags')
      .insert({ name, color: color || '#3b82f6', created_by: MASTER_ADMIN_ID })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Tag already exists' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
