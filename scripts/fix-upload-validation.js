const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/dashboard/project/[id]/reports/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update handleFileChange to add file size validation
const oldHandleFileChange = `  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };`;

const newHandleFileChange = `  const MAX_FILE_SIZE_MB = 200; // Supabase storage limit

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const oversizedFiles = newFiles.filter(f => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);

      if (oversizedFiles.length > 0) {
        alert(\`File(s) too large: \${oversizedFiles.map(f => \`\${f.name} (\${(f.size / 1024 / 1024).toFixed(1)}MB)\`).join(', ')}.\\n\\nMaximum file size is \${MAX_FILE_SIZE_MB}MB. Please compress the video or use a smaller file.\`);
        // Only add files that are within limit
        const validFiles = newFiles.filter(f => f.size <= MAX_FILE_SIZE_MB * 1024 * 1024);
        if (validFiles.length > 0) {
          setAttachments(prev => [...prev, ...validFiles]);
        }
        return;
      }

      setAttachments(prev => [...prev, ...newFiles]);
    }
  };`;

content = content.replace(oldHandleFileChange, newHandleFileChange);
console.log('✓ Added file size validation to handleFileChange');

// 2. Update handleReplyFileChange if it exists
const oldReplyFileChange = `  const handleReplyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setReplyAttachments(prev => [...prev, ...newFiles]);
    }
  };`;

const newReplyFileChange = `  const handleReplyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const oversizedFiles = newFiles.filter(f => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);

      if (oversizedFiles.length > 0) {
        alert(\`File(s) too large: \${oversizedFiles.map(f => \`\${f.name} (\${(f.size / 1024 / 1024).toFixed(1)}MB)\`).join(', ')}.\\n\\nMaximum file size is \${MAX_FILE_SIZE_MB}MB. Please compress the video or use a smaller file.\`);
        const validFiles = newFiles.filter(f => f.size <= MAX_FILE_SIZE_MB * 1024 * 1024);
        if (validFiles.length > 0) {
          setReplyAttachments(prev => [...prev, ...validFiles]);
        }
        return;
      }

      setReplyAttachments(prev => [...prev, ...newFiles]);
    }
  };`;

if (content.includes(oldReplyFileChange)) {
  content = content.replace(oldReplyFileChange, newReplyFileChange);
  console.log('✓ Added file size validation to handleReplyFileChange');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✓ Done! File size validation added.');
