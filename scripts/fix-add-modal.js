const fs = require('fs');
const filePath = 'app/dashboard/project/[id]/modules/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find line with "Stakeholders" in Add Modal and replace the whole block
const lines = content.split('\n');
let inAddModal = false;
let foundStakeholdersInAdd = false;
let startLine = -1;
let endLine = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('setShowAddModal(false)')) {
    inAddModal = false;
  }
  if (lines[i].includes('Add Module') && lines[i].includes('h2')) {
    inAddModal = true;
  }
  if (inAddModal && lines[i].includes('Stakeholders') && lines[i].includes('label')) {
    foundStakeholdersInAdd = true;
    startLine = i - 1; // <div> before label
  }
  if (foundStakeholdersInAdd && lines[i].includes('</div>') && lines[i+1] && lines[i+1].includes('</div>')) {
    endLine = i;
    break;
  }
}

console.log('Found stakeholders section at lines:', startLine, 'to', endLine);

if (startLine > 0 && endLine > startLine) {
  const newSection = `              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stakeholders
                </label>
                {projectStakeholders.length === 0 ? (
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
                )}
              </div>`;

  lines.splice(startLine, endLine - startLine + 1, newSection);
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log('Fixed Add Modal stakeholders');
} else {
  console.log('Could not find section to replace');
}
