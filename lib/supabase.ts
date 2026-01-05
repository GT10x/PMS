import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for public/anon access
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Server-side client with service role key for admin operations
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);

// Direct upload to Supabase storage (bypasses Vercel 4.5MB limit)
export async function uploadFileDirect(file: File): Promise<string | null> {
  try {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileExt = file.name.split('.').pop();
    const isVoiceNote = file.name.toLowerCase().includes('voice');
    const fileName = isVoiceNote
      ? `voice-${timestamp}-${randomString}.${fileExt}`
      : `${timestamp}-${randomString}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('report-attachments')
      .upload(fileName, file, {
        contentType: file.type,
        cacheControl: '3600'
      });

    if (error) {
      console.error('Direct upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('report-attachments')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    return null;
  }
}
