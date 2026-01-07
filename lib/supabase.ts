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
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
    console.log(`Uploading ${file.name} (${fileSizeMB}MB)...`);

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
      throw new Error(`Failed to prepare upload: ${error.error || 'Unknown error'}`);
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
      const errorText = await uploadResponse.text();
      console.error('Failed to upload file:', uploadResponse.status, errorText);

      // Parse common Supabase storage errors
      if (uploadResponse.status === 413 || errorText.includes('Payload too large') || errorText.includes('file size')) {
        throw new Error(`File "${file.name}" (${fileSizeMB}MB) exceeds storage limit. Please compress the video or use a smaller file.`);
      }
      throw new Error(`Upload failed for "${file.name}": ${uploadResponse.statusText}`);
    }

    console.log(`✓ Uploaded ${file.name} successfully`);
    return publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    // Re-throw with user-friendly message
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to upload file: ${file.name}`);
  }
}
