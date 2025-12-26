const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createBucket() {
  console.log('Creating storage bucket: report-attachments...');

  // Check if bucket already exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('Error listing buckets:', listError.message);
    return;
  }

  const existingBucket = buckets?.find(b => b.name === 'report-attachments');

  if (existingBucket) {
    console.log('Bucket "report-attachments" already exists!');
    return;
  }

  // Create the bucket
  const { data, error } = await supabase.storage.createBucket('report-attachments', {
    public: true,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: [
      'image/*',
      'audio/*',
      'video/*',
      'application/pdf',
      'text/*'
    ]
  });

  if (error) {
    console.error('Error creating bucket:', error.message);
    return;
  }

  console.log('✅ Storage bucket "report-attachments" created successfully!');
  console.log('   - Public: Yes');
  console.log('   - Max file size: 50MB');
  console.log('   - Allowed types: images, audio, video, PDF, text');
}

createBucket();
