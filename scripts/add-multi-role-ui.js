const fs = require('fs');
const filePath = 'C:/Users/PCS/pms/app/dashboard/projects/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add project_roles to ProjectMember interface
content = content.replace(
  `interface ProjectMember {
  user_id: string;
  full_name: string;
  role: string;
}`,
  `interface ProjectMember {
  user_id: string;
  full_name: string;
  role: string;
  project_roles?: string[];
}

const AVAILABLE_PROJECT_ROLES = [
  { value: 'developer', label: 'Developer' },
  { value: 'tester', label: 'Tester' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'designer', label: 'Designer' },
  { value: 'qa', label: 'QA' },
];`
);

// 2. Add memberRoles state after formData state
content = content.replace(
  `const [error, setError] = useState('');`,
  `const [memberRoles, setMemberRoles] = useState<Record<string, string[]>>({});
  const [error, setError] = useState('');`
);

// 3. Update handleAddProject to send new format with roles
content = content.replace(
  `body: JSON.stringify({
          ...formData,
          team_members: formData.member_ids,
        }),`,
  `body: JSON.stringify({
          ...formData,
          team_members: formData.member_ids.map(userId => ({
            user_id: userId,
            project_roles: memberRoles[userId] || []
          })),
        }),`
);

// 4. Update handleEditProject to send new format with roles
content = content.replace(
  `const response = await fetch(\`/api/projects/\${selectedProject.id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          team_members: formData.member_ids,
        }),
      });`,
  `const response = await fetch(\`/api/projects/\${selectedProject.id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          team_members: formData.member_ids.map(userId => ({
            user_id: userId,
            project_roles: memberRoles[userId] || []
          })),
        }),
      });`
);

// 5. Update openEditModal to load existing roles
content = content.replace(
  `const openEditModal = (project: Project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      status: project.status,
      priority: project.priority,
      start_date: project.start_date || '',
      member_ids: project.members?.map(m => m.user_id) || [],
    });
    setShowEditModal(true);
  };`,
  `const openEditModal = (project: Project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      status: project.status,
      priority: project.priority,
      start_date: project.start_date || '',
      member_ids: project.members?.map(m => m.user_id) || [],
    });
    // Load existing project roles for each member
    const existingRoles: Record<string, string[]> = {};
    project.members?.forEach(m => {
      existingRoles[m.user_id] = m.project_roles || [];
    });
    setMemberRoles(existingRoles);
    setShowEditModal(true);
  };`
);

// 6. Update resetForm to reset roles
content = content.replace(
  `const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      status: 'planning',
      priority: 'medium',
      start_date: '',
      member_ids: [],
    });
    setError('');
  };`,
  `const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      status: 'planning',
      priority: 'medium',
      start_date: '',
      member_ids: [],
    });
    setMemberRoles({});
    setError('');
  };`
);

// 7. Add toggleRole function after toggleMember
content = content.replace(
  `const toggleMember = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      member_ids: prev.member_ids.includes(userId)
        ? prev.member_ids.filter(id => id !== userId)
        : [...prev.member_ids, userId]
    }));
  };`,
  `const toggleMember = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      member_ids: prev.member_ids.includes(userId)
        ? prev.member_ids.filter(id => id !== userId)
        : [...prev.member_ids, userId]
    }));
    // Clear roles when member is removed
    if (formData.member_ids.includes(userId)) {
      setMemberRoles(prev => {
        const newRoles = { ...prev };
        delete newRoles[userId];
        return newRoles;
      });
    }
  };

  const toggleRole = (userId: string, role: string) => {
    setMemberRoles(prev => {
      const currentRoles = prev[userId] || [];
      const newRoles = currentRoles.includes(role)
        ? currentRoles.filter(r => r !== role)
        : [...currentRoles, role];
      return { ...prev, [userId]: newRoles };
    });
  };`
);

// 8. Update the team members UI section to show role selection
content = content.replace(
  `<div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Assign Team Members
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  {users.map((user) => (
                    <label
                      key={user.id}
                      className={\`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors \${
                        formData.member_ids.includes(user.id)
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-500'
                          : 'bg-white dark:bg-gray-800 border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                      }\`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.member_ids.includes(user.id)}
                        onChange={() => toggleMember(user.id)}
                        className="sr-only"
                      />
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                        {user.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-white">{user.full_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role.replace('_', ' ')}</p>
                      </div>
                      {formData.member_ids.includes(user.id) && (
                        <i className="fas fa-check-circle text-indigo-500 ml-auto"></i>
                      )}
                    </label>
                  ))}
                </div>
              </div>`,
  `<div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Assign Team Members
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  {users.map((user) => (
                    <div key={user.id} className="bg-white dark:bg-gray-800 rounded-lg border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-600 overflow-hidden">
                      <label
                        className={\`flex items-center gap-3 p-3 cursor-pointer transition-colors \${
                          formData.member_ids.includes(user.id)
                            ? 'bg-indigo-50 dark:bg-indigo-900/30'
                            : ''
                        }\`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.member_ids.includes(user.id)}
                          onChange={() => toggleMember(user.id)}
                          className="sr-only"
                        />
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                          {user.full_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-white">{user.full_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role.replace('_', ' ')}</p>
                        </div>
                        {formData.member_ids.includes(user.id) ? (
                          <i className="fas fa-check-circle text-indigo-500 flex-shrink-0"></i>
                        ) : (
                          <i className="far fa-circle text-gray-300 flex-shrink-0"></i>
                        )}
                      </label>
                      {/* Role selection - only show when member is selected */}
                      {formData.member_ids.includes(user.id) && (
                        <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Project roles:</p>
                          <div className="flex flex-wrap gap-1">
                            {AVAILABLE_PROJECT_ROLES.map((role) => (
                              <button
                                key={role.value}
                                type="button"
                                onClick={() => toggleRole(user.id, role.value)}
                                className={\`px-2 py-1 text-xs rounded-full transition-colors \${
                                  (memberRoles[user.id] || []).includes(role.value)
                                    ? 'bg-indigo-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }\`}
                              >
                                {role.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>`
);

fs.writeFileSync(filePath, content);
console.log('Updated projects page with multi-role selection UI');
