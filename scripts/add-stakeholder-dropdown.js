const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/dashboard/project/[id]/modules/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add projectStakeholders state after project state
content = content.replace(
  'const [project, setProject] = useState<Project | null>(null);',
  `const [project, setProject] = useState<Project | null>(null);
  const [projectStakeholders, setProjectStakeholders] = useState<string[]>([]);`
);
console.log('✓ Added projectStakeholders state');

// 2. Change formData stakeholders from string to array
content = content.replace(
  "stakeholders: ''",
  "stakeholders: [] as string[]"
);
content = content.replace(
  "stakeholders: ''",
  "stakeholders: [] as string[]"
);
console.log('✓ Changed formData.stakeholders to array');

// 3. Update fetchProject to also get stakeholders (or fetch separately)
// Find where project is fetched and add stakeholders fetch
content = content.replace(
  'const fetchProject = async () => {',
  `const fetchProjectStakeholders = async () => {
    try {
      const response = await fetch(\`/api/projects/\${projectId}\`);
      if (response.ok) {
        const data = await response.json();
        setProjectStakeholders(data.project.stakeholders || []);
      }
    } catch (error) {
      console.error('Error fetching stakeholders:', error);
    }
  };

  const fetchProject = async () => {`
);
console.log('✓ Added fetchProjectStakeholders function');

// 4. Call fetchProjectStakeholders in useEffect
content = content.replace(
  'fetchProject();',
  'fetchProject();\n    fetchProjectStakeholders();'
);
console.log('✓ Added fetchProjectStakeholders call');

// 5. Update openEditModal to set stakeholders as array
content = content.replace(
  "stakeholders: module.stakeholders?.join(', ') || ''",
  "stakeholders: module.stakeholders || []"
);
console.log('✓ Updated openEditModal stakeholders');

// 6. Update handleAddModule to use array directly
content = content.replace(
  `stakeholders: formData.stakeholders
            ? formData.stakeholders.split(',').map(s => s.trim()).filter(Boolean)
            : []`,
  `stakeholders: formData.stakeholders`
);
console.log('✓ Updated handleAddModule stakeholders');

// 7. Update handleEditModule to use array directly
content = content.replace(
  `stakeholders: formData.stakeholders
            ? formData.stakeholders.split(',').map(s => s.trim()).filter(Boolean)
            : []`,
  `stakeholders: formData.stakeholders`
);
console.log('✓ Updated handleEditModule stakeholders');

// 8. Replace Add Modal stakeholders input with multi-select dropdown
const oldAddStakeholders = `              <div>
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
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}`;

const newAddStakeholders = `              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stakeholders
                </label>
                {projectStakeholders.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic py-2">
                    No stakeholders added to project yet. <a href={\`/dashboard/project/\${projectId}/stakeholders\`} className="text-indigo-600 hover:underline">Add stakeholders</a>
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
                              setFormData({ ...formData, stakeholders: formData.stakeholders.filter(s => s !== stakeholder) });
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
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}`;

content = content.replace(oldAddStakeholders, newAddStakeholders);
console.log('✓ Replaced Add Modal stakeholders with dropdown');

// 9. Replace Edit Modal stakeholders input with multi-select dropdown
const oldEditStakeholders = `              <div>
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
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}`;

const newEditStakeholders = `              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stakeholders
                </label>
                {projectStakeholders.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic py-2">
                    No stakeholders added to project yet. <a href={\`/dashboard/project/\${projectId}/stakeholders\`} className="text-indigo-600 hover:underline">Add stakeholders</a>
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
                              setFormData({ ...formData, stakeholders: formData.stakeholders.filter(s => s !== stakeholder) });
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
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}`;

content = content.replace(oldEditStakeholders, newEditStakeholders);
console.log('✓ Replaced Edit Modal stakeholders with dropdown');

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ Done! Stakeholders dropdown added to Add/Edit Module modals.');
