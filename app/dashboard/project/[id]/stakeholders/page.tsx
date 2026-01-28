'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Breadcrumb from '@/components/Breadcrumb';

interface Project {
  id: string;
  name: string;
  stakeholders: string[];
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_admin: boolean;
}

const AVAILABLE_MODULES = [
  { name: 'overview', label: 'Overview', icon: 'fa-home' },
  { name: 'reports', label: 'Reports', icon: 'fa-bug' },
  { name: 'versions', label: 'Versions', icon: 'fa-code-branch' },
  { name: 'modules', label: 'Modules', icon: 'fa-cubes' },
  { name: 'flow', label: 'Flow', icon: 'fa-project-diagram' },
  { name: 'chat', label: 'Chat', icon: 'fa-comments' },
  { name: 'stakeholders', label: 'Stakeholders', icon: 'fa-users' },
  { name: 'settings', label: 'Settings', icon: 'fa-cog' },
] as const;

export default function StakeholdersPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stakeholders, setStakeholders] = useState<string[]>([]);
  const [newStakeholder, setNewStakeholder] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  // Permissions management state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [savingPermissions, setSavingPermissions] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [canManagePermissions, setCanManagePermissions] = useState(false);
  const [showAccessControl, setShowAccessControl] = useState(false);

  useEffect(() => {
    fetchProject();
    fetchCurrentUser();
    fetchUsers();
    fetchPermissions();
  }, []);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data.project);
        setStakeholders(data.project.stakeholders || []);
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/users/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        setCanManagePermissions(
          data.user?.is_admin ||
          data.user?.role === 'project_manager'
        );
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/permissions`);
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions || {});
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const toggleModuleAccess = async (userId: string, moduleName: string) => {
    if (!canManagePermissions) return;

    setSavingPermissions(userId);

    const currentModules = permissions[userId] || [];
    let newModules: string[];

    if (currentModules.length === 0) {
      // User currently has full access (no restrictions)
      // Setting a permission means restricting to ONLY that module
      newModules = [moduleName];
    } else if (currentModules.includes(moduleName)) {
      // Remove module access
      newModules = currentModules.filter(m => m !== moduleName);
    } else {
      // Add module access
      newModules = [...currentModules, moduleName];
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, modules: newModules })
      });

      if (response.ok) {
        setPermissions(prev => ({
          ...prev,
          [userId]: newModules
        }));
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
    } finally {
      setSavingPermissions(null);
    }
  };

  const giveFullAccess = async (userId: string) => {
    if (!canManagePermissions) return;

    setSavingPermissions(userId);

    try {
      const response = await fetch(`/api/projects/${projectId}/permissions?user_id=${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setPermissions(prev => {
          const newPerms = { ...prev };
          delete newPerms[userId];
          return newPerms;
        });
      }
    } catch (error) {
      console.error('Error removing permissions:', error);
    } finally {
      setSavingPermissions(null);
    }
  };

  const restrictAllModules = async (userId: string) => {
    if (!canManagePermissions) return;

    setSavingPermissions(userId);

    // Give access to only overview (minimal access)
    const newModules = ['overview'];

    try {
      const response = await fetch(`/api/projects/${projectId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, modules: newModules })
      });

      if (response.ok) {
        setPermissions(prev => ({
          ...prev,
          [userId]: newModules
        }));
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
    } finally {
      setSavingPermissions(null);
    }
  };

  const saveStakeholders = async (newList: string[]) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stakeholders: newList })
      });
      if (response.ok) {
        setStakeholders(newList);
      }
    } catch (error) {
      console.error('Error saving stakeholders:', error);
    } finally {
      setSaving(false);
    }
  };

  const addStakeholder = () => {
    if (newStakeholder.trim()) {
      const newList = [...stakeholders, newStakeholder.trim()];
      saveStakeholders(newList);
      setNewStakeholder('');
    }
  };

  const deleteStakeholder = (index: number) => {
    const newList = stakeholders.filter((_, i) => i !== index);
    saveStakeholders(newList);
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditingText(stakeholders[index]);
  };

  const saveEdit = () => {
    if (editingIndex !== null && editingText.trim()) {
      const newList = [...stakeholders];
      newList[editingIndex] = editingText.trim();
      saveStakeholders(newList);
    }
    setEditingIndex(null);
    setEditingText('');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingText('');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) return null;

  return (
    <DashboardLayout>
      <Breadcrumb items={[
        { label: 'Projects', href: '/dashboard/projects', icon: 'fas fa-folder' },
        { label: project.name, href: `/dashboard/project/${projectId}` },
        { label: 'Stakeholders' }
      ]} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">{project.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage project stakeholders</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="card mb-6 p-1 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          <a href={`/dashboard/project/${projectId}`} className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors">
            <i className="fas fa-home"></i>
            Overview
          </a>
          <a href={`/dashboard/project/${projectId}/reports`} className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors">
            <i className="fas fa-bug"></i>
            Reports
          </a>
          <a href={`/dashboard/project/${projectId}/versions`} className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors">
            <i className="fas fa-code-branch"></i>
            Versions
          </a>
          <a href={`/dashboard/project/${projectId}/modules`} className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors">
            <i className="fas fa-cubes"></i>
            Modules
          </a>
          <a href={`/dashboard/project/${projectId}/stakeholders`} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-medium text-sm">
            <i className="fas fa-users"></i>
            Stakeholders
          </a>
          <a href={`/dashboard/project/${projectId}/flow`} className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors">
            <i className="fas fa-project-diagram"></i>
            Flow
          </a>
          <a href={`/dashboard/project/${projectId}/chat`} className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors">
            <i className="fas fa-comments"></i>
            Chat
          </a>
          <a href={`/dashboard/project/${projectId}/settings`} className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors">
            <i className="fas fa-cog"></i>
            Settings
          </a>
        </div>
      </div>

      {/* Stakeholders Card */}
      <div className="card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            <i className="fas fa-users mr-2 text-indigo-500"></i>
            Stakeholders ({stakeholders.length})
          </h2>
          {saving && (
            <span className="text-sm text-indigo-500">
              <i className="fas fa-spinner fa-spin mr-1"></i> Saving...
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Key stakeholders for this project (clients, managers, decision makers).
        </p>

        {/* Add Stakeholder Input */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newStakeholder}
            onChange={(e) => setNewStakeholder(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addStakeholder(); }}
            placeholder="Enter stakeholder name..."
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            onClick={addStakeholder}
            disabled={!newStakeholder.trim() || saving}
            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition font-medium"
          >
            <i className="fas fa-plus mr-2"></i>
            Add
          </button>
        </div>

        {/* Stakeholder List */}
        <div className="space-y-2">
          {stakeholders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <i className="fas fa-users text-4xl mb-3"></i>
              <p>No stakeholders added yet</p>
              <p className="text-sm">Add stakeholders to track key people involved in this project</p>
            </div>
          ) : (
            stakeholders.map((stakeholder, idx) => (
              <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-4 py-3 rounded-xl group">
                {editingIndex === idx ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      className="flex-1 px-3 py-2 border border-indigo-300 dark:border-indigo-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                    />
                    <button onClick={saveEdit} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg">
                      <i className="fas fa-check"></i>
                    </button>
                    <button onClick={cancelEdit} className="p-2 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg">
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
                        <i className="fas fa-user text-indigo-600 dark:text-indigo-400"></i>
                      </div>
                      <span className="text-gray-900 dark:text-white font-medium">{stakeholder}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditing(idx)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <i className="fas fa-pen text-sm"></i>
                      </button>
                      <button
                        onClick={() => deleteStakeholder(idx)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <i className="fas fa-trash text-sm"></i>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Module Access Control Card */}
      <div className="card p-4 sm:p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            <i className="fas fa-shield-alt mr-2 text-indigo-500"></i>
            Module Access Control
          </h2>
          <button
            onClick={() => setShowAccessControl(!showAccessControl)}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {showAccessControl ? 'Hide' : 'Show'} <i className={`fas fa-chevron-${showAccessControl ? 'up' : 'down'} ml-1`}></i>
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Control which modules each user can access in this project. By default, all users have full access.
          {!canManagePermissions && (
            <span className="text-amber-500 ml-2">
              <i className="fas fa-lock mr-1"></i>
              Only PM and Admin can manage permissions.
            </span>
          )}
        </p>

        {showAccessControl && (
          <>
            {loadingPermissions ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <i className="fas fa-users-slash text-4xl mb-3"></i>
                <p>No users found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header row */}
                <div className="hidden sm:grid sm:grid-cols-[200px_1fr_auto] gap-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300">
                  <div>User</div>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_MODULES.map(mod => (
                      <div key={mod.name} className="w-20 text-center text-xs">
                        <i className={`fas ${mod.icon} mr-1`}></i>
                        {mod.label}
                      </div>
                    ))}
                  </div>
                  <div className="w-24 text-center">Actions</div>
                </div>

                {/* User rows */}
                {users.map(user => {
                  const userModules = permissions[user.id] || [];
                  const hasFullAccess = userModules.length === 0;
                  const isCurrentlyEditing = savingPermissions === user.id;

                  return (
                    <div
                      key={user.id}
                      className={`bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 ${isCurrentlyEditing ? 'opacity-60' : ''}`}
                    >
                      {/* Mobile: Stack layout */}
                      <div className="sm:hidden space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
                            <i className="fas fa-user text-indigo-600 dark:text-indigo-400"></i>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{user.full_name}</div>
                            <div className="text-xs text-gray-500">{user.role?.replace('_', ' ')}</div>
                          </div>
                          {user.is_admin && (
                            <span className="ml-auto px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full">
                              Admin
                            </span>
                          )}
                        </div>
                        {user.is_admin ? (
                          <div className="text-sm text-gray-500 dark:text-gray-400 pl-2">
                            <i className="fas fa-infinity mr-2"></i>
                            Admins always have full access
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap gap-2">
                              {AVAILABLE_MODULES.map(mod => {
                                const hasAccess = hasFullAccess || userModules.includes(mod.name);
                                return (
                                  <button
                                    key={mod.name}
                                    onClick={() => canManagePermissions && toggleModuleAccess(user.id, mod.name)}
                                    disabled={!canManagePermissions || isCurrentlyEditing}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                      hasAccess
                                        ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                                        : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                                    } ${canManagePermissions ? 'hover:opacity-80 cursor-pointer' : 'cursor-not-allowed'}`}
                                  >
                                    <i className={`fas ${mod.icon} mr-1`}></i>
                                    {mod.label}
                                  </button>
                                );
                              })}
                            </div>
                            {canManagePermissions && (
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => giveFullAccess(user.id)}
                                  disabled={isCurrentlyEditing || hasFullAccess}
                                  className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition"
                                >
                                  <i className="fas fa-unlock mr-1"></i>
                                  Full Access
                                </button>
                                <button
                                  onClick={() => restrictAllModules(user.id)}
                                  disabled={isCurrentlyEditing}
                                  className="text-xs px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg transition"
                                >
                                  <i className="fas fa-lock mr-1"></i>
                                  Restrict
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Desktop: Grid layout */}
                      <div className="hidden sm:grid sm:grid-cols-[200px_1fr_auto] gap-4 items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
                            <i className="fas fa-user text-indigo-600 dark:text-indigo-400"></i>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{user.full_name}</div>
                            <div className="text-xs text-gray-500">{user.role?.replace('_', ' ')}</div>
                          </div>
                        </div>

                        {user.is_admin ? (
                          <div className="text-sm text-gray-500 dark:text-gray-400 col-span-2">
                            <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full mr-2">
                              Admin
                            </span>
                            <i className="fas fa-infinity mr-1"></i>
                            Always has full access
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap gap-2">
                              {AVAILABLE_MODULES.map(mod => {
                                const hasAccess = hasFullAccess || userModules.includes(mod.name);
                                return (
                                  <button
                                    key={mod.name}
                                    onClick={() => canManagePermissions && toggleModuleAccess(user.id, mod.name)}
                                    disabled={!canManagePermissions || isCurrentlyEditing}
                                    title={`${hasAccess ? 'Has' : 'No'} access to ${mod.label}`}
                                    className={`w-20 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                      hasAccess
                                        ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                                        : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                                    } ${canManagePermissions ? 'hover:opacity-80 cursor-pointer' : 'cursor-not-allowed'}`}
                                  >
                                    <i className={`fas ${hasAccess ? 'fa-check' : 'fa-times'}`}></i>
                                  </button>
                                );
                              })}
                            </div>
                            <div className="w-24 flex gap-1">
                              {canManagePermissions && (
                                <>
                                  <button
                                    onClick={() => giveFullAccess(user.id)}
                                    disabled={isCurrentlyEditing || hasFullAccess}
                                    title="Give full access to all modules"
                                    className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
                                  >
                                    <i className="fas fa-unlock"></i>
                                  </button>
                                  <button
                                    onClick={() => restrictAllModules(user.id)}
                                    disabled={isCurrentlyEditing}
                                    title="Restrict to Overview only"
                                    className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors disabled:opacity-50"
                                  >
                                    <i className="fas fa-lock"></i>
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Status indicator */}
                      {!user.is_admin && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 sm:ml-[200px]">
                          {hasFullAccess ? (
                            <span className="text-green-600 dark:text-green-400">
                              <i className="fas fa-check-circle mr-1"></i>
                              Full access to all modules
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">
                              <i className="fas fa-shield-alt mr-1"></i>
                              Restricted to: {userModules.join(', ')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
