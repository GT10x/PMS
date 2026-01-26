import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

// GET /api/remarks/[remarkId]/replies - Get all replies for a remark
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ remarkId: string }> }
) {
  try {
    const { remarkId } = await params;

    const { data: replies, error } = await (supabaseAdmin as any)
      .from('remark_replies')
      .select(`
        *,
        created_by_user:user_profiles!remark_replies_created_by_fkey(id, full_name)
      `)
      .eq('remark_id', remarkId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching replies:', error);
      return NextResponse.json(
        { error: 'Failed to fetch replies' },
        { status: 500 }
      );
    }

    return NextResponse.json({ replies: replies || [] });
  } catch (error) {
    console.error('Error in GET replies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/remarks/[remarkId]/replies - Create a new reply
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ remarkId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { remarkId } = await params;
    const body = await request.json();
    const { content, voice_url, image_url } = body;

    // Validate that at least one field is provided
    if (!content && !voice_url && !image_url) {
      return NextResponse.json(
        { error: 'Reply must have content, voice, or image' },
        { status: 400 }
      );
    }

    // Verify the remark exists
    const { data: remark, error: remarkError } = await supabaseAdmin
      .from('feature_remarks')
      .select('id')
      .eq('id', remarkId)
      .single();

    if (remarkError || !remark) {
      return NextResponse.json(
        { error: 'Remark not found' },
        { status: 404 }
      );
    }

    // Create the reply
    const { data: reply, error } = await (supabaseAdmin as any)
      .from('remark_replies')
      .insert({
        remark_id: remarkId,
        content: content || null,
        voice_url: voice_url || null,
        image_url: image_url || null,
        created_by: userId
      })
      .select(`
        *,
        created_by_user:user_profiles!remark_replies_created_by_fkey(id, full_name)
      `)
      .single();

    if (error) {
      console.error('Error creating reply:', error);
      return NextResponse.json(
        { error: 'Failed to create reply' },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply }, { status: 201 });
  } catch (error) {
    console.error('Error in POST reply:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
