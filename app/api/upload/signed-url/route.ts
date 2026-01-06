import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

// Get current user from cookie
async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  if (!userId) {
    return null;
  }

  const { data } = await supabaseAdmin
    .from('user_profiles')
    .select('id, full_name')
    .eq('id', userId)
    .single();

  return data;
}

// POST /api/upload/signed-url - Get a signed URL for direct upload to Supabase
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { fileName, contentType } = body;

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: 'fileName and contentType are required' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileExt = fileName.split('.').pop();
    const isVoiceNote = fileName.toLowerCase().includes('voice');
    const uniqueFileName = isVoiceNote
      ? `voice-${timestamp}-${randomString}.${fileExt}`
      : `${timestamp}-${randomString}.${fileExt}`;

    // Create signed upload URL (valid for 1 hour)
    const { data, error } = await supabaseAdmin.storage
      .from('report-attachments')
      .createSignedUploadUrl(uniqueFileName);

    if (error) {
      console.error('Error creating signed URL:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get the public URL that will be valid after upload
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('report-attachments')
      .getPublicUrl(uniqueFileName);

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      publicUrl: publicUrlData.publicUrl,
      fileName: uniqueFileName
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
