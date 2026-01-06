const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/dashboard/project/[id]/modules/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state for inline editing after expandedModules state
const oldState = `const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());`;
const newState = `const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Inline editing states
  const [editingFeature, setEditingFeature] = useState<{ moduleId: string; index: number } | null>(null);
  const [editingFeatureText, setEditingFeatureText] = useState('');
  const [addingFeature, setAddingFeature] = useState<string | null>(null);
  const [newFeatureText, setNewFeatureText] = useState('');`;

content = content.replace(oldState, newState);
console.log('✓ Added inline editing states');

// 2. Add inline edit functions before canManageModules
const oldCanManage = `const canManageModules = () => {`;
const newCanManage = `// Inline feature editing
  const startEditFeature = (moduleId: string, index: number, text: string) => {
    setEditingFeature({ moduleId, index });
    setEditingFeatureText(text);
  };

  const saveEditFeature = async (moduleId: string) => {
    if (!editingFeature) return;
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    const lines = module.description ? module.description.split('\\n').filter(line => line.trim()) : [];
    lines[editingFeature.index] = editingFeatureText.trim();

    try {
      const response = await fetch(\`/api/projects/\${projectId}/modules\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: moduleId,
          description: lines.join('\\n')
        })
      });
      if (response.ok) {
        const data = await response.json();
        setModules(prev => prev.map(m => m.id === moduleId ? data.module : m));
      }
    } catch (error) {
      console.error('Error updating feature:', error);
    }
    setEditingFeature(null);
    setEditingFeatureText('');
  };

  const deleteFeature = async (moduleId: string, index: number) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    const lines = module.description ? module.description.split('\\n').filter(line => line.trim()) : [];
    lines.splice(index, 1);

    try {
      const response = await fetch(\`/api/projects/\${projectId}/modules\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: moduleId,
          description: lines.join('\\n')
        })
      });
      if (response.ok) {
        const data = await response.json();
        setModules(prev => prev.map(m => m.id === moduleId ? data.module : m));
      }
    } catch (error) {
      console.error('Error deleting feature:', error);
    }
  };

  const addFeature = async (moduleId: string) => {
    if (!newFeatureText.trim()) return;
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    const lines = module.description ? module.description.split('\\n').filter(line => line.trim()) : [];
    lines.push(newFeatureText.trim());

    try {
      const response = await fetch(\`/api/projects/\${projectId}/modules\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: moduleId,
          description: lines.join('\\n')
        })
      });
      if (response.ok) {
        const data = await response.json();
        setModules(prev => prev.map(m => m.id === moduleId ? data.module : m));
      }
    } catch (error) {
      console.error('Error adding feature:', error);
    }
    setAddingFeature(null);
    setNewFeatureText('');
  };

  const canManageModules = () => {`;

content = content.replace(oldCanManage, newCanManage);
console.log('✓ Added inline edit functions');

// 3. Replace the description/features section with inline editing
const oldFeaturesList = `                    {/* Description */}
                    {descriptionLines.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Features / Description:
                        </h4>
                        <ul className="space-y-1.5">
                          {descriptionLines.map((line, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <span className="text-indigo-500 mt-1">•</span>
                              <span>{line.replace(/^[•\\-\\*]\\s*/, '')}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Actions */}`;

const newFeaturesList = `                    {/* Features List with Inline Editing */}
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Features / Functions:
                      </h4>
                      <ul className="space-y-2">
                        {descriptionLines.map((line, idx) => {
                          const isEditing = editingFeature?.moduleId === module.id && editingFeature?.index === idx;
                          const cleanLine = line.replace(/^[•\\-\\*]\\s*/, '');

                          return (
                            <li key={idx} className="flex items-start gap-2 group">
                              <span className="text-indigo-500 mt-2">•</span>
                              {isEditing ? (
                                <div className="flex-1 flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editingFeatureText}
                                    onChange={(e) => setEditingFeatureText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveEditFeature(module.id);
                                      if (e.key === 'Escape') { setEditingFeature(null); setEditingFeatureText(''); }
                                    }}
                                    className="flex-1 px-2 py-1 text-sm border border-indigo-300 dark:border-indigo-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => saveEditFeature(module.id)}
                                    className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                  >
                                    <i className="fas fa-check"></i>
                                  </button>
                                  <button
                                    onClick={() => { setEditingFeature(null); setEditingFeatureText(''); }}
                                    className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                  >
                                    <i className="fas fa-times"></i>
                                  </button>
                                </div>
                              ) : (
                                <div className="flex-1 flex items-center justify-between">
                                  <span className="text-sm text-gray-600 dark:text-gray-400">{cleanLine}</span>
                                  {canManageModules() && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); startEditFeature(module.id, idx, cleanLine); }}
                                        className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded"
                                        title="Edit"
                                      >
                                        <i className="fas fa-pen text-xs"></i>
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); deleteFeature(module.id, idx); }}
                                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                        title="Delete"
                                      >
                                        <i className="fas fa-trash text-xs"></i>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>

                      {/* Add Feature */}
                      {canManageModules() && (
                        <div className="mt-3">
                          {addingFeature === module.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-indigo-500">•</span>
                              <input
                                type="text"
                                value={newFeatureText}
                                onChange={(e) => setNewFeatureText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') addFeature(module.id);
                                  if (e.key === 'Escape') { setAddingFeature(null); setNewFeatureText(''); }
                                }}
                                placeholder="Type feature and press Enter..."
                                className="flex-1 px-2 py-1 text-sm border border-indigo-300 dark:border-indigo-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                autoFocus
                              />
                              <button
                                onClick={() => addFeature(module.id)}
                                className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                              >
                                <i className="fas fa-check"></i>
                              </button>
                              <button
                                onClick={() => { setAddingFeature(null); setNewFeatureText(''); }}
                                className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setAddingFeature(module.id); }}
                              className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                            >
                              <i className="fas fa-plus text-xs"></i>
                              <span>Add Feature</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}`;

content = content.replace(oldFeaturesList, newFeaturesList);
console.log('✓ Updated features list with inline editing');

// 4. Update the actions section to say "Edit Details" instead of just "Edit"
const oldActions = `                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(module); }}
                          className="px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                        >
                          <i className="fas fa-edit mr-1"></i> Edit
                        </button>`;

const newActions = `                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(module); }}
                          className="px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                        >
                          <i className="fas fa-cog mr-1"></i> Edit Details
                        </button>`;

content = content.replace(oldActions, newActions);
console.log('✓ Updated Edit button to "Edit Details"');

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✓ Done! Modules page updated with inline editing.');
