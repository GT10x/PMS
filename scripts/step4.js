const fs = require('fs');
const filePath = 'app/dashboard/project/[id]/modules/page.tsx';
let c = fs.readFileSync(filePath, 'utf8');

// Step 4: Add fetchProjectStakeholders call in useEffect
c = c.replace(
  'fetchProject();\n    fetchModules();',
  'fetchProject();\n    fetchProjectStakeholders();\n    fetchModules();'
);

fs.writeFileSync(filePath, c);
console.log('Step 4 done - added useEffect call');
