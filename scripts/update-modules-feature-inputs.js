const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/dashboard/project/[id]/modules/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state for features array after formData state
const oldFormDataState = `  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 'medium',
    status: 'planned',
    eta: '',
    stakeholders: ''
  });`;

const newFormDataState = `  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 'medium',
    status: 'planned',
    eta: '',
    stakeholders: ''
  });

  // Features as array for numbered inputs
  const [featuresList, setFeaturesList] = useState<string[]>(['']);`;

content = content.replace(oldFormDataState, newFormDataState);
console.log('✓ Added featuresList state');

// 2. Update resetForm to also reset featuresList
const oldResetForm = `  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      priority: 'medium',
      status: 'planned',
      eta: '',
      stakeholders: ''
    });
  };`;

const newResetForm = `  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      priority: 'medium',
      status: 'planned',
      eta: '',
      stakeholders: ''
    });
    setFeaturesList(['']);
  };`;

content = content.replace(oldResetForm, newResetForm);
console.log('✓ Updated resetForm');

// 3. Update openEditModal to populate featuresList
const oldOpenEditModal = `  const openEditModal = (module: Module) => {
    setSelectedModule(module);
    setFormData({
      name: module.name,
      description: module.description || '',
      priority: module.priority,
      status: module.status,
      eta: module.eta || '',
      stakeholders: module.stakeholders?.join(', ') || ''
    });
    setShowEditModal(true);
  };`;

const newOpenEditModal = `  const openEditModal = (module: Module) => {
    setSelectedModule(module);
    const features = module.description
      ? module.description.split('\\n').filter(line => line.trim()).map(line => line.replace(/^[•\\-\\*\\d\\.]+\\s*/, ''))
      : [''];
    setFormData({
      name: module.name,
      description: module.description || '',
      priority: module.priority,
      status: module.status,
      eta: module.eta || '',
      stakeholders: module.stakeholders?.join(', ') || ''
    });
    setFeaturesList(features.length > 0 ? features : ['']);
    setShowEditModal(true);
  };`;

content = content.replace(oldOpenEditModal, newOpenEditModal);
console.log('✓ Updated openEditModal');

// 4. Update handleAddModule to use featuresList
const oldHandleAddModule = `  const handleAddModule = async () => {
    if (!formData.name.trim()) {
      alert('Module name is required');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(\`/api/projects/\${projectId}/modules\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,`;

const newHandleAddModule = `  const handleAddModule = async () => {
    if (!formData.name.trim()) {
      alert('Module name is required');
      return;
    }

    setSaving(true);
    try {
      // Convert featuresList to newline-separated description
      const description = featuresList.filter(f => f.trim()).join('\\n');

      const response = await fetch(\`/api/projects/\${projectId}/modules\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: description,`;

content = content.replace(oldHandleAddModule, newHandleAddModule);
console.log('✓ Updated handleAddModule');

// 5. Update handleUpdateModule to use featuresList
const oldHandleUpdateModule = `  const handleUpdateModule = async () => {
    if (!selectedModule || !formData.name.trim()) {
      alert('Module name is required');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(\`/api/projects/\${projectId}/modules\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: selectedModule.id,
          name: formData.name,
          description: formData.description,`;

const newHandleUpdateModule = `  const handleUpdateModule = async () => {
    if (!selectedModule || !formData.name.trim()) {
      alert('Module name is required');
      return;
    }

    setSaving(true);
    try {
      // Convert featuresList to newline-separated description
      const description = featuresList.filter(f => f.trim()).join('\\n');

      const response = await fetch(\`/api/projects/\${projectId}/modules\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: selectedModule.id,
          name: formData.name,
          description: description,`;

content = content.replace(oldHandleUpdateModule, newHandleUpdateModule);
console.log('✓ Updated handleUpdateModule');

// 6. Replace textarea with numbered inputs in Add Modal
const oldAddTextarea = `              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description / Features
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  rows={5}
                  placeholder="• Login with email/password&#10;• Social login support&#10;• Password reset flow&#10;• Session management"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Write each feature on a new line. Use bullet points (•) or dashes (-) for clarity.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority`;

const newAddFeatures = `              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Features / Functions
                </label>
                <div className="space-y-2">
                  {featuresList.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium min-w-[24px] text-sm">{idx + 1}.</span>
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => {
                          const updated = [...featuresList];
                          updated[idx] = e.target.value;
                          setFeaturesList(updated);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setFeaturesList([...featuresList, '']);
                          }
                        }}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={idx === 0 ? "e.g., Login with email/password" : "Add another feature..."}
                      />
                      {featuresList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setFeaturesList(featuresList.filter((_, i) => i !== idx))}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        >
                          <i className="fas fa-times text-xs"></i>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setFeaturesList([...featuresList, ''])}
                  className="mt-2 flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
                >
                  <i className="fas fa-plus text-xs"></i>
                  <span>Add Feature</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority`;

content = content.replace(oldAddTextarea, newAddFeatures);
console.log('✓ Replaced textarea with numbered inputs in Add Modal');

// 7. Replace textarea with numbered inputs in Edit Modal
const oldEditTextarea = `              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description / Features
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="input-field"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input-field"
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ETA (Target Date)
                </label>
                <input
                  type="date"
                  value={formData.eta}
                  onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stakeholders
                </label>
                <input
                  type="text"
                  value={formData.stakeholders}
                  onChange={(e) => setFormData({ ...formData, stakeholders: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>`;

const newEditFeatures = `              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Features / Functions
                </label>
                <div className="space-y-2">
                  {featuresList.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium min-w-[24px] text-sm">{idx + 1}.</span>
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => {
                          const updated = [...featuresList];
                          updated[idx] = e.target.value;
                          setFeaturesList(updated);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setFeaturesList([...featuresList, '']);
                          }
                        }}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Feature description..."
                      />
                      {featuresList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setFeaturesList(featuresList.filter((_, i) => i !== idx))}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        >
                          <i className="fas fa-times text-xs"></i>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setFeaturesList([...featuresList, ''])}
                  className="mt-2 flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
                >
                  <i className="fas fa-plus text-xs"></i>
                  <span>Add Feature</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="input-field"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input-field"
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ETA (Target Date)
                </label>
                <input
                  type="date"
                  value={formData.eta}
                  onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stakeholders
                </label>
                <input
                  type="text"
                  value={formData.stakeholders}
                  onChange={(e) => setFormData({ ...formData, stakeholders: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>`;

content = content.replace(oldEditTextarea, newEditFeatures);
console.log('✓ Replaced textarea with numbered inputs in Edit Modal');

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✓ Done! Modals now show numbered inputs for features.');
