const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/dashboard/project/[id]/reports/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Update handleCreateReport to properly catch upload errors
const oldCreateReport = `  const handleCreateReport = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please fill in title and description');
      return;
    }

    setUploading(true);
    try {
      // Upload attachments directly to Supabase (bypasses Vercel 4.5MB limit)
      const uploadedUrls: string[] = [];

      // Upload regular files
      for (const file of attachments) {
        const url = await uploadFileWithSignedUrl(file);
        if (url) {
          uploadedUrls.push(url);
        } else {
          console.error('Failed to upload file:', file.name);
        }
      }

      // Upload voice note if exists
      if (voiceNote) {
        const voiceFile = new File([voiceNote], \`voice-note-\${Date.now()}.webm\`, { type: 'audio/webm' });
        const url = await uploadFileWithSignedUrl(voiceFile);
        if (url) {
          uploadedUrls.push(url);
        }
      }`;

const newCreateReport = `  const handleCreateReport = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please fill in title and description');
      return;
    }

    setUploading(true);
    try {
      // Upload attachments directly to Supabase (bypasses Vercel 4.5MB limit)
      const uploadedUrls: string[] = [];

      // Upload regular files
      for (const file of attachments) {
        try {
          const url = await uploadFileWithSignedUrl(file);
          if (url) {
            uploadedUrls.push(url);
          }
        } catch (uploadError) {
          const errorMsg = uploadError instanceof Error ? uploadError.message : 'Upload failed';
          alert(\`Upload Error: \${errorMsg}\`);
          setUploading(false);
          return;
        }
      }

      // Upload voice note if exists
      if (voiceNote) {
        try {
          const voiceFile = new File([voiceNote], \`voice-note-\${Date.now()}.webm\`, { type: 'audio/webm' });
          const url = await uploadFileWithSignedUrl(voiceFile);
          if (url) {
            uploadedUrls.push(url);
          }
        } catch (uploadError) {
          const errorMsg = uploadError instanceof Error ? uploadError.message : 'Voice note upload failed';
          alert(\`Upload Error: \${errorMsg}\`);
          setUploading(false);
          return;
        }
      }`;

content = content.replace(oldCreateReport, newCreateReport);
console.log('✓ Updated handleCreateReport with proper error handling');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Done!');
