const fs = require('fs');
const filePath = 'app/dashboard/project/[id]/modules/page.tsx';
let c = fs.readFileSync(filePath, 'utf8');

// Step 7: Replace Add Modal stakeholders text input
const addModalOld = `              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stakeholders
                </label>
                <input
                  type="text"
                  value={formData.stakeholders}
                  onChange={(e) => setFormData({ ...formData, stakeholders: e.target.value })}
                  className="input-field"
                  placeholder="e.g., John, Sarah, Marketing Team"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Separate multiple stakeholders with commas
                </p>
              </div>`;

const addModalNew = `              <div>
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

if (c.includes(addModalOld)) {
  c = c.replace(addModalOld, addModalNew);
  console.log('Replaced Add Modal stakeholders');
} else {
  console.log('Add Modal pattern not found');
}

// Step 8: Replace Edit Modal stakeholders text input
const editModalOld = `              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stakeholders
                </label>
                <input
                  type="text"
                  value={formData.stakeholders}
                  onChange={(e) => setFormData({ ...formData, stakeholders: e.target.value })}
                  className="input-field"
                  placeholder="e.g., John, Sarah, Marketing Team"
                />
              </div>`;

const editModalNew = `              <div>
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

if (c.includes(editModalOld)) {
  c = c.replace(editModalOld, editModalNew);
  console.log('Replaced Edit Modal stakeholders');
} else {
  console.log('Edit Modal pattern not found');
}

fs.writeFileSync(filePath, c);
console.log('Step 7 & 8 done');
