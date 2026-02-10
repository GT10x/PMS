'use client';

const ALL_TABS = [
  { key: 'overview', label: 'Overview', icon: 'fa-home', path: '' },
  { key: 'reports', label: 'Reports', icon: 'fa-bug', path: '/reports' },
  { key: 'versions', label: 'Versions', icon: 'fa-code-branch', path: '/versions' },
  { key: 'modules', label: 'Modules', icon: 'fa-cubes', path: '/modules' },
  { key: 'qa', label: 'Q&A', icon: 'fa-question-circle', path: '/qa' },
  { key: 'stakeholders', label: 'Stakeholders', icon: 'fa-users', path: '/stakeholders' },
  { key: 'flow', label: 'Flow', icon: 'fa-project-diagram', path: '/flow' },
  { key: 'chat', label: 'Chat', icon: 'fa-comments', path: '/chat' },
  { key: 'settings', label: 'Settings', icon: 'fa-cog', path: '/settings' },
];

interface ProjectNavTabsProps {
  projectId: string;
  activeTab: string;
  hasAccess: (moduleName: string) => boolean;
}

export default function ProjectNavTabs({ projectId, activeTab, hasAccess }: ProjectNavTabsProps) {
  const visibleTabs = ALL_TABS.filter(tab => hasAccess(tab.key));

  return (
    <div className="card mb-6 p-1 overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {visibleTabs.map(tab => {
          const isActive = tab.key === activeTab;
          const href = `/dashboard/project/${projectId}${tab.path}`;

          return (
            <a
              key={tab.key}
              href={href}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <i className={`fas ${tab.icon}`}></i>
              {tab.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}
