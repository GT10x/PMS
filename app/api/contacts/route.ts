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

// GET /api/contacts - List all contacts with search & tag filter
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.id !== MASTER_ADMIN_ID) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const tagId = searchParams.get('tagId') || '';
    const favorite = searchParams.get('favorite');

    let query = supabaseAdmin.from('contacts').select('*').eq('created_by', MASTER_ADMIN_ID).order('is_favorite', { ascending: false }).order('full_name');

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,company.ilike.%${search}%,nickname.ilike.%${search}%`);
    }
    if (favorite === 'true') {
      query = query.eq('is_favorite', true);
    }

    const { data: contacts, error } = await query;
    if (error) throw error;

    // Get tags for all contacts
    const contactIds = (contacts || []).map(c => c.id);
    let tagsMap: Record<string, any[]> = {};
    if (contactIds.length > 0) {
      const { data: tagMaps } = await supabaseAdmin
        .from('contact_tag_map')
        .select('contact_id, tag_id, contact_tags(id, name, color)')
        .in('contact_id', contactIds);

      for (const tm of tagMaps || []) {
        if (!tagsMap[tm.contact_id]) tagsMap[tm.contact_id] = [];
        if (tm.contact_tags) tagsMap[tm.contact_id].push(tm.contact_tags);
      }
    }

    // Get latest remark for each contact
    let remarksMap: Record<string, any> = {};
    if (contactIds.length > 0) {
      const { data: remarks } = await supabaseAdmin
        .from('contact_remarks')
        .select('*')
        .in('contact_id', contactIds)
        .order('created_at', { ascending: false });

      for (const r of remarks || []) {
        if (!remarksMap[r.contact_id]) remarksMap[r.contact_id] = r;
      }
    }

    // Get overdue reminder count per contact
    let remindersMap: Record<string, number> = {};
    if (contactIds.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const { data: reminders } = await supabaseAdmin
        .from('contact_reminders')
        .select('contact_id')
        .in('contact_id', contactIds)
        .eq('is_done', false)
        .lte('reminder_date', today);

      for (const r of reminders || []) {
        remindersMap[r.contact_id] = (remindersMap[r.contact_id] || 0) + 1;
      }
    }

    // Enrich contacts
    const enriched = (contacts || []).map(c => ({
      ...c,
      tags: tagsMap[c.id] || [],
      latest_remark: remarksMap[c.id] || null,
      overdue_reminders: remindersMap[c.id] || 0,
    }));

    // Filter by tag if requested
    let result = enriched;
    if (tagId) {
      result = enriched.filter(c => c.tags.some((t: any) => t.id === tagId));
    }

    // Search in remarks too
    if (search) {
      const { data: remarkMatches } = await supabaseAdmin
        .from('contact_remarks')
        .select('contact_id')
        .ilike('content', `%${search}%`);
      const remarkContactIds = new Set((remarkMatches || []).map(r => r.contact_id));
      const existingIds = new Set(result.map(c => c.id));

      // Add contacts found via remark search that aren't already in result
      for (const cid of remarkContactIds) {
        if (!existingIds.has(cid)) {
          const match = enriched.find(c => c.id === cid);
          if (match) result.push(match);
        }
      }
    }

    return NextResponse.json({ contacts: result });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/contacts - Create a new contact
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.id !== MASTER_ADMIN_ID) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { tagIds, ...contactData } = body;

    const { data: contact, error } = await supabaseAdmin
      .from('contacts')
      .insert({ ...contactData, created_by: MASTER_ADMIN_ID })
      .select()
      .single();

    if (error) throw error;

    // Assign tags if provided
    if (tagIds && tagIds.length > 0) {
      const tagMaps = tagIds.map((tid: string) => ({ contact_id: contact.id, tag_id: tid }));
      await supabaseAdmin.from('contact_tag_map').insert(tagMaps);
    }

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
