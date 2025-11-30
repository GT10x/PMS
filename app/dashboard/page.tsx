'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [modulePermissions, setModulePermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');

      if (!response.ok) {
        router.push('/login');
        return;
      }

      const data = await response.json();
      setUser(data.user);
      setModulePermissions(data.modulePermissions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user:', error);
      router.push('/login');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PMS Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">
                Welcome, {user.full_name}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 py-3">
            <a
              href="/dashboard"
              className="text-indigo-600 border-b-2 border-indigo-600 px-1 pb-3 text-sm font-medium"
            >
              Dashboard
            </a>
            {(user.is_admin || user.role === 'project_manager') && (
              <a
                href="/dashboard/users"
                className="text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300 px-1 pb-3 text-sm font-medium"
              >
                User Management
              </a>
            )}
            {(user.is_admin || modulePermissions.includes('all') || modulePermissions.includes('Projects')) && (
              <a
                href="/dashboard/projects"
                className="text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300 px-1 pb-3 text-sm font-medium"
              >
                Projects
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Info Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Full Name</p>
              <p className="text-base font-medium text-gray-900">{user.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Role</p>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 capitalize">
                {user.role.replace('_', ' ')}
              </span>
            </div>
            {user.email && (
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-base font-medium text-gray-900">{user.email}</p>
              </div>
            )}
            {user.username && (
              <div>
                <p className="text-sm text-gray-500">Username</p>
                <p className="text-base font-medium text-gray-900">{user.username}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Access Level</p>
              <p className="text-base font-medium text-gray-900">
                {user.is_admin ? 'Admin (Full Access)' : 'Limited Access'}
              </p>
            </div>
          </div>
        </div>

        {/* Module Access */}
        {!user.is_admin && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Your Module Access
            </h2>
            {modulePermissions.length === 0 ? (
              <p className="text-gray-500">No modules assigned yet.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {modulePermissions.map((module) => (
                  <div
                    key={module}
                    className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-800"
                  >
                    {module}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Admin Quick Actions */}
        {user.is_admin && (
          <div className="bg-white rounded-lg shadow p-6 mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Admin Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="/dashboard/users"
                className="block p-4 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
              >
                <h3 className="font-medium text-indigo-900">Manage Users</h3>
                <p className="text-sm text-indigo-700 mt-1">
                  Add, edit, or remove users
                </p>
              </a>
              <a
                href="/dashboard/projects"
                className="block p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition"
              >
                <h3 className="font-medium text-green-900">Manage Projects</h3>
                <p className="text-sm text-green-700 mt-1">
                  Create and manage projects
                </p>
              </a>
              <a
                href="/dashboard/modules"
                className="block p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition"
              >
                <h3 className="font-medium text-purple-900">Manage Modules</h3>
                <p className="text-sm text-purple-700 mt-1">
                  School ERP modules
                </p>
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
