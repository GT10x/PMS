const fs = require('fs');
const filePath = 'app/dashboard/project/[id]/modules/page.tsx';
let c = fs.readFileSync(filePath, 'utf8');

// Replace ALL text inputs for stakeholders with checkboxes
// Use regex to be more flexible with whitespace

const checkboxUI = `{projectStakeholders.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic py-2">
                    No stakeholders added. <a href={\`/dashboard/project/\${projectId}/stakeholders\`} className="text-indigo-600 hover:underline">Add stakeholders</a>
                  </p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-xl p-3 bg-white dark:bg-gray-700">
                    {projectStakeholders.map((stakeholder, idx) => (
                      <label key={idx} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 p-2 rounded-lg">
                        <input
                          type="checkbox"
                          checked={formData.stakeholders.includes(stakeholder)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, stakeholders: [...formData.stakeholders, stakeholder] });
                            } else {
                              setFormData({ ...formData, stakeholders: formData.stakeholders.filter((s) => s !== stakeholder) });
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                        <span className="text-gray-900 dark:text-white">{stakeholder}</span>
                      </label>
                    ))}
                  </div>
                )}
                {formData.stakeholders.length > 0 && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                    Selected: {formData.stakeholders.join(', ')}
                  </p>
                )}`;

// Replace the Add Modal input (has placeholder and hint)
c = c.replace(
  /<input\s+type="text"\s+value=\{formData\.stakeholders\}\s+onChange=\{\(e\) => setFormData\(\{ \.\.\.formData, stakeholders: e\.target\.value \}\)\}\s+className="input-field"\s+placeholder="e\.g\., John, Sarah, Marketing Team"\s+\/>\s+<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">\s+Separate multiple stakeholders with commas\s+<\/p>/,
  checkboxUI
);

// Replace the Edit Modal input (no placeholder/hint)
c = c.replace(
  /<input\s+type="text"\s+value=\{formData\.stakeholders\}\s+onChange=\{\(e\) => setFormData\(\{ \.\.\.formData, stakeholders: e\.target\.value \}\)\}\s+className="input-field"\s+placeholder="e\.g\., John, Sarah, Marketing Team"\s+\/>/,
  checkboxUI
);

fs.writeFileSync(filePath, c);
console.log('Done - replaced stakeholder inputs with checkboxes');
