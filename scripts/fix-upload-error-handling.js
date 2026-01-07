const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../lib/supabase.ts');
let content = fs.readFileSync(filePath, 'utf8');

const oldUploadFunc = `// Upload file using signed URL (bypasses Vercel 4.5MB limit for large files)
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
}`;

const newUploadFunc = `// Upload file using signed URL (bypasses Vercel 4.5MB limit for large files)
// This is the recommended approach for files of any size
export async function uploadFileWithSignedUrl(file: File): Promise<string | null> {
  try {
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
    console.log(\`Uploading \${file.name} (\${fileSizeMB}MB)...\`);

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
      throw new Error(\`Failed to prepare upload: \${error.error || 'Unknown error'}\`);
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
        throw new Error(\`File "\${file.name}" (\${fileSizeMB}MB) exceeds storage limit. Please compress the video or use a smaller file.\`);
      }
      throw new Error(\`Upload failed for "\${file.name}": \${uploadResponse.statusText}\`);
    }

    console.log(\`✓ Uploaded \${file.name} successfully\`);
    return publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    // Re-throw with user-friendly message
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(\`Failed to upload file: \${file.name}\`);
  }
}`;

content = content.replace(oldUploadFunc, newUploadFunc);
console.log('✓ Updated uploadFileWithSignedUrl with better error handling');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Done!');
