const fs = require('fs');
const path = require('path');

const projectPagesDir = 'C:/Users/PCS/pms/app/dashboard/project/[id]';

// Get all page files
const files = [
  'page.tsx',
  'reports/page.tsx',
  'versions/page.tsx',
  'modules/page.tsx',
  'chat/page.tsx',
  'stakeholders/page.tsx',
  'flow/page.tsx',
  'settings/page.tsx'
];

files.forEach(file => {
  const filePath = path.join(projectPagesDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix: card mb-6 p-1 -> card mb-6 p-1 overflow-x-auto scrollbar-hide
    // And: flex gap-1 -> flex gap-1 min-w-max
    
    // Pattern 1: Navigation tabs container without overflow-x-auto
    if (content.includes('card mb-6 p-1"') && !content.includes('overflow-x-auto')) {
      content = content.replace(
        /<div className="card mb-6 p-1">/g,
        '<div className="card mb-6 p-1 overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: \'touch\' }}>'
      );
    }
    
    // Pattern 2: Check for flex gap-1 inside Navigation Tabs and add min-w-max
    // This is trickier - look for the pattern after Navigation Tabs comment
    const navTabsPattern = /({\/\* Navigation Tabs \*\/}\s*<div className="card mb-6 p-1[^"]*"[^>]*>\s*<div className="flex gap-1)(")/g;
    content = content.replace(navTabsPattern, '$1 min-w-max$2');
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${file}`);
  } else {
    console.log(`Not found: ${file}`);
  }
});

console.log('Done!');
