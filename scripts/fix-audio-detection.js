const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'app', 'dashboard', 'project', '[id]', 'reports', 'page.tsx');

let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `const isAudio = url.includes('.webm') || url.includes('audio') || url.includes('voice') || url.includes('.mp3') || url.includes('.wav') || url.includes('.ogg');
                      const isImage = url.includes('.png') || url.includes('.jpg') || url.includes('.jpeg') || url.includes('.gif') || url.includes('.webp');`;

const newCode = `const lowerUrl = url.toLowerCase();
                      const isAudio = lowerUrl.endsWith('.webm') || lowerUrl.endsWith('.mp3') || lowerUrl.endsWith('.wav') || lowerUrl.endsWith('.ogg') || lowerUrl.endsWith('.m4a') || lowerUrl.includes('audio') || lowerUrl.includes('voice');
                      const isImage = lowerUrl.endsWith('.png') || lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.gif') || lowerUrl.endsWith('.webp') || lowerUrl.endsWith('.svg');`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Audio detection fix applied successfully!');
} else {
  console.log('Could not find the exact code to replace.');
  // Try to find the pattern
  if (content.includes('const isAudio = url.includes')) {
    console.log('Found isAudio line but exact match failed.');
  }
}
