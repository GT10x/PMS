import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client for public/anon access (works on both client and server)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Server-side client with service role key for admin operations
// On client-side, supabaseServiceRoleKey is undefined, so we use a dummy client
// This is safe because supabaseAdmin should never be called from client-side code
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient<Database>(supabaseUrl, supabaseServiceRoleKey)
  : createClient<Database>(supabaseUrl, supabaseAnonKey); // Fallback for type safety

// Upload file using signed URL (bypasses Vercel 4.5MB limit for large files)
// This is the recommended approach for files of any size
export async function uploadFileWithSignedUrl(file: File): Promise<string | null> {
  try {
    // Step 1: Get signed URL from server
    const response = await fetch('/api/upload/signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to get signed URL:', error);
      return null;
    }

    const { signedUrl, publicUrl } = await response.json();

    // Step 2: Upload directly to Supabase using signed URL
    const uploadResponse = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file
    });

    if (!uploadResponse.ok) {
      console.error('Failed to upload file:', uploadResponse.statusText);
      return null;
    }

    // Step 3: Return the public URL
    return publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    return null;
  }
}
