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

// GET /api/contacts/[id] - Get single contact with all related data
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.id !== MASTER_ADMIN_ID) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [contactRes, tagsRes, remarksRes, attachmentsRes, remindersRes] = await Promise.all([
      supabaseAdmin.from('contacts').select('*').eq('id', id).single(),
      supabaseAdmin.from('contact_tag_map').select('tag_id, contact_tags(id, name, color)').eq('contact_id', id),
      supabaseAdmin.from('contact_remarks').select('*').eq('contact_id', id).order('created_at', { ascending: false }),
      supabaseAdmin.from('contact_attachments').select('*').eq('contact_id', id).order('created_at', { ascending: false }),
      supabaseAdmin.from('contact_reminders').select('*').eq('contact_id', id).order('reminder_date'),
    ]);

    if (contactRes.error) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const tags = (tagsRes.data || []).map(t => t.contact_tags).filter(Boolean);

    return NextResponse.json({
      contact: {
        ...contactRes.data,
        tags,
        remarks: remarksRes.data || [],
        attachments: attachmentsRes.data || [],
        reminders: remindersRes.data || [],
      }
    });
  } catch (error) {
    console.error('Error fetching contact:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/contacts/[id] - Update contact
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.id !== MASTER_ADMIN_ID) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { tagIds, ...contactData } = body;

    // Convert empty strings to null for date and optional fields
    for (const key of Object.keys(contactData)) {
      if (contactData[key] === '') contactData[key] = null;
    }

    const { data: contact, error } = await supabaseAdmin
      .from('contacts')
      .update({ ...contactData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update tags if provided
    if (tagIds !== undefined) {
      await supabaseAdmin.from('contact_tag_map').delete().eq('contact_id', id);
      if (tagIds.length > 0) {
        const tagMaps = tagIds.map((tid: string) => ({ contact_id: id, tag_id: tid }));
        await supabaseAdmin.from('contact_tag_map').insert(tagMaps);
      }
    }

    return NextResponse.json({ contact });
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/contacts/[id] - Delete contact (cascade)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.id !== MASTER_ADMIN_ID) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabaseAdmin.from('contacts').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
