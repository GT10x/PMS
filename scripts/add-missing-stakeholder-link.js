const fs = require('fs');
let c = fs.readFileSync('app/dashboard/project/[id]/modules/page.tsx', 'utf8');
c = c.replace(/\r\n/g, '\n');

// Pattern to find: selected text followed by closing </p> and )}
const oldPattern = `{formData.stakeholders.length > 0 && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                    Selected: {formData.stakeholders.join(', ')}
                  </p>
                )}
              </div>`;

const newPattern = `{formData.stakeholders.length > 0 && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                    Selected: {formData.stakeholders.join(', ')}
                  </p>
                )}
                <a
                  href={\`/dashboard/project/\${projectId}/stakeholders\`}
                  target="_blank"
                  className="text-xs text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 mt-2 inline-flex items-center gap-1"
                >
                  <i className="fas fa-plus-circle"></i>
                  Add a missing stakeholder
                </a>
              </div>`;

// Replace all occurrences (both Add and Edit modals)
const count = (c.match(new RegExp(oldPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
c = c.split(oldPattern).join(newPattern);

fs.writeFileSync('app/dashboard/project/[id]/modules/page.tsx', c);
console.log(`Replaced ${count} occurrences`);
