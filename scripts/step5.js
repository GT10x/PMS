const fs = require('fs');
const filePath = 'app/dashboard/project/[id]/modules/page.tsx';
let c = fs.readFileSync(filePath, 'utf8');

// Step 5: Update openEditModal stakeholders
c = c.replace(
  "stakeholders: module.stakeholders?.join(', ') || ''",
  "stakeholders: module.stakeholders || []"
);

// Step 6: Update handleAddModule and handleEditModule - stakeholders no longer needs split
c = c.replace(
  /stakeholders: formData\.stakeholders\s*\n\s*\? formData\.stakeholders\.split\(','\)\.map\(s => s\.trim\(\)\)\.filter\(Boolean\)\s*\n\s*: \[\]/g,
  "stakeholders: formData.stakeholders"
);

fs.writeFileSync(filePath, c);
console.log('Step 5 & 6 done - updated stakeholders handling');
