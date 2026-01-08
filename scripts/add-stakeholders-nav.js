const fs = require('fs');
const path = require('path');

const pages = [
  'app/dashboard/project/[id]/page.tsx',
  'app/dashboard/project/[id]/reports/page.tsx',
  'app/dashboard/project/[id]/versions/page.tsx',
  'app/dashboard/project/[id]/modules/page.tsx',
  'app/dashboard/project/[id]/chat/page.tsx',
  'app/dashboard/project/[id]/settings/page.tsx'
];

const stakeholderTab = `          <a
            href={\`/dashboard/project/\${projectId}/stakeholders\`}
            className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors"
          >
            <i className="fas fa-users"></i>
            Stakeholders
          </a>
`;

pages.forEach(pagePath => {
  const fullPath = path.join(__dirname, '..', pagePath);
  if (!fs.existsSync(fullPath)) {
    console.log('Skip (not found):', pagePath);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Check if stakeholders tab already exists
  if (content.includes('/stakeholders`}')) {
    console.log('Skip (already has):', pagePath);
    return;
  }

  // Find and replace - add before chat tab
  const chatPattern = /(\s+<a\s+href=\{`\/dashboard\/project\/\$\{projectId\}\/chat`\})/;

  if (chatPattern.test(content)) {
    content = content.replace(chatPattern, '\n' + stakeholderTab + '$1');
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Updated:', pagePath);
  } else {
    console.log('Pattern not found in:', pagePath);
  }
});

// Remove stakeholders section from settings page
console.log('\nRemoving stakeholders from settings page...');
const settingsPath = path.join(__dirname, '..', 'app/dashboard/project/[id]/settings/page.tsx');
let settings = fs.readFileSync(settingsPath, 'utf8');

// Remove stakeholders state
settings = settings.replace(/\s*const \[stakeholders, setStakeholders\] = useState<string\[\]>\(\[\]\);/, '');
settings = settings.replace(/\s*const \[newStakeholder, setNewStakeholder\] = useState\(''\);/, '');

// Remove stakeholders initialization
settings = settings.replace(/\s*setStakeholders\(data\.project\.stakeholders \|\| \[\]\);/, '');

// Remove stakeholders from save
settings = settings.replace(/, stakeholders/, '');

// Remove the entire stakeholders section UI (this is trickier - look for the section)
const stakeholdersSectionRegex = /\s*\{\/\* Stakeholders Section \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*(?=\s*<\/div>\s*<\/DashboardLayout>)/;
settings = settings.replace(stakeholdersSectionRegex, '');

fs.writeFileSync(settingsPath, settings, 'utf8');
console.log('Cleaned settings page');

console.log('\nDone!');
