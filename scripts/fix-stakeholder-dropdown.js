const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/dashboard/project/[id]/modules/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add projectStakeholders state
content = content.replace(
  'const [project, setProject] = useState<Project | null>(null);',
  `const [project, setProject] = useState<Project | null>(null);
  const [projectStakeholders, setProjectStakeholders] = useState<string[]>([]);`
);
console.log('✓ Added projectStakeholders state');

// 2. Change formData stakeholders from string to array (both instances)
content = content.replace(
  /stakeholders: ''/g,
  'stakeholders: [] as string[]'
);
console.log('✓ Changed formData.stakeholders to array');

// 3. Add fetchProjectStakeholders call in useEffect
content = content.replace(
  'fetchProject();\n    fetchModules();',
  `fetchProject();
    fetchProjectStakeholders();
    fetchModules();`
);
console.log('✓ Added fetchProjectStakeholders call in useEffect');

// 4. Add fetchProjectStakeholders function after fetchProject
content = content.replace(
  `const fetchProject = async () => {
    try {
      const response = await fetch(\`/api/projects/\${projectId}/view\`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };`,
  `const fetchProject = async () => {
    try {
      const response = await fetch(\`/api/projects/\${projectId}/view\`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  const fetchProjectStakeholders = async () => {
    try {
      const response = await fetch(\`/api/projects/\${projectId}\`);
      if (response.ok) {
        const data = await response.json();
        setProjectStakeholders(data.project.stakeholders || []);
      }
    } catch (error) {
      console.error('Error fetching stakeholders:', error);
    }
  };`
);
console.log('✓ Added fetchProjectStakeholders function');

// 5. Update openEditModal to set stakeholders as array
content = content.replace(
  "stakeholders: module.stakeholders?.join(', ') || ''",
  "stakeholders: module.stakeholders || []"
);
console.log('✓ Updated openEditModal stakeholders');

// 6. Update handleAddModule - stakeholders is already array now
content = content.replace(
  `stakeholders: formData.stakeholders
            ? formData.stakeholders.split(',').map(s => s.trim()).filter(Boolean)
            : []`,
  `stakeholders: formData.stakeholders`
);
console.log('✓ Updated handleAddModule');

// 7. Update handleEditModule - stakeholders is already array now
content = content.replace(
  `stakeholders: formData.stakeholders
            ? formData.stakeholders.split(',').map(s => s.trim()).filter(Boolean)
            : []`,
  `stakeholders: formData.stakeholders`
);
console.log('✓ Updated handleEditModule');

// 8. Replace Add Modal stakeholders text input with checkboxes
const oldAddInput = `              <div>
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

const newAddInput = `              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stakeholders
                </label>
                {projectStakeholders.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic py-2">
                    No stakeholders added yet. <a href={\`/dashboard/project/\${projectId}/stakeholders\`} className="text-indigo-600 hover:underline">Add stakeholders</a>
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
                              setFormData({ ...formData, stakeholders: formData.stakeholders.filter((s: string) => s !== stakeholder) });
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

content = content.replace(oldAddInput, newAddInput);
console.log('✓ Replaced Add Modal stakeholders input');

// 9. Replace Edit Modal stakeholders text input with checkboxes
const oldEditInput = `              <div>
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

const newEditInput = `              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stakeholders
                </label>
                {projectStakeholders.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic py-2">
                    No stakeholders added yet. <a href={\`/dashboard/project/\${projectId}/stakeholders\`} className="text-indigo-600 hover:underline">Add stakeholders</a>
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
                              setFormData({ ...formData, stakeholders: formData.stakeholders.filter((s: string) => s !== stakeholder) });
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

content = content.replace(oldEditInput, newEditInput);
console.log('✓ Replaced Edit Modal stakeholders input');

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ Done!');
