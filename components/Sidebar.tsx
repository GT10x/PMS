'use client';

import Link from 'next/link';

interface User {
  id: string;
  full_name: string;
  role: string;
  is_admin: boolean;
}

interface SidebarProps {
  user: User;
  isAdminOrPM: boolean;
  collapsed: boolean;
  onToggle: () => void;
  currentPath: string;
  darkMode: boolean;
  onDarkModeToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({
  user,
  isAdminOrPM,
  collapsed,
  onToggle,
  currentPath,
  darkMode,
  onDarkModeToggle,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const menuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: 'fas fa-home',
      show: true,
    },
    {
      name: 'Projects',
      path: '/dashboard/projects',
      icon: 'fas fa-folder-open',
      show: isAdminOrPM,
    },
    {
      name: 'Users',
      path: '/dashboard/users',
      icon: 'fas fa-users',
      show: isAdminOrPM,
    },
    {
      name: 'Admin Reports',
      path: '/dashboard/admin-reports',
      icon: 'fas fa-chart-bar',
      show: isAdminOrPM,
    },
    {
      name: 'Tester Dashboard',
      path: '/dashboard/tester',
      icon: 'fas fa-bug',
      show: user.role === 'tester' || isAdminOrPM,
    },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return currentPath === '/dashboard';
    }
    return currentPath.startsWith(path);
  };

  const handleLinkClick = () => {
    // Close mobile menu when a link is clicked
    if (mobileOpen) {
      onMobileClose();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full bg-white dark:bg-gray-800 shadow-xl transition-all duration-300 z-50 ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
      {/* Logo Section */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-bold text-gray-800 dark:text-white text-lg">PMS</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Project Management</p>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
        >
          <i className={`fas ${collapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="p-4 space-y-2">
        {menuItems
          .filter((item) => item.show)
          .map((item) => (
            <Link
              key={item.path}
              href={item.path}
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive(item.path)
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <i
                className={`${item.icon} text-lg ${
                  isActive(item.path) ? 'text-white' : 'text-gray-400 group-hover:text-indigo-500'
                } ${collapsed ? 'mx-auto' : ''}`}
              ></i>
              {!collapsed && <span className="font-medium">{item.name}</span>}
            </Link>
          ))}
      </nav>

      {/* Dark Mode Toggle */}
      <div className="absolute bottom-20 left-0 right-0 px-4">
        <button
          onClick={onDarkModeToggle}
          className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700`}
        >
          <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'} text-lg text-gray-400 ${collapsed ? 'mx-auto' : ''}`}></i>
          {!collapsed && (
            <span className="font-medium">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          )}
          {!collapsed && (
            <div className={`ml-auto w-10 h-6 rounded-full transition-colors ${darkMode ? 'bg-indigo-500' : 'bg-gray-300'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform mt-0.5 ${darkMode ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`}></div>
            </div>
          )}
        </button>
      </div>

      {/* User Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold">
              {user.full_name.charAt(0).toUpperCase()}
            </span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-medium text-gray-800 dark:text-white text-sm truncate">
                {user.full_name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {user.role.replace('_', ' ')}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
    </>
  );
}
