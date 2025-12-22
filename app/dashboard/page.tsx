'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

interface User {
  id: string;
  full_name: string;
  email: string | null;
  username: string | null;
  role: string;
  is_admin: boolean;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [assignedProjects, setAssignedProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    teamMembers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
        return;
      }
      const data = await response.json();
      setUser(data.user);

      // Fetch stats for admin/PM
      if (data.user.is_admin || data.user.role === 'project_manager') {
        const projectsRes = await fetch('/api/projects');
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          const projects = projectsData.projects || [];
          setStats({
            totalProjects: projects.length,
            activeProjects: projects.filter((p: Project) => p.status === 'in_progress').length,
            completedProjects: projects.filter((p: Project) => p.status === 'completed').length,
            teamMembers: 4, // You can fetch actual count
          });
        }
      } else {
        // Fetch assigned projects for regular users
        const projectsRes = await fetch(`/api/users/${data.user.id}/projects`);
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          setAssignedProjects(projectsData.projects || []);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isAdminOrPM = user.is_admin || user.role === 'project_manager';

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Welcome back, {user.full_name.split(' ')[0]}!
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Here's what's happening with your projects today.
        </p>
      </div>

      {/* Stats Cards for Admin/PM */}
      {isAdminOrPM && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Projects */}
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Projects</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">
                  {stats.totalProjects}
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                <i className="fas fa-folder-open text-indigo-500 text-xl"></i>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-500 flex items-center">
                <i className="fas fa-arrow-up mr-1"></i> 12%
              </span>
              <span className="text-gray-400 ml-2">vs last month</span>
            </div>
          </div>

          {/* Active Projects */}
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Projects</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">
                  {stats.activeProjects}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <i className="fas fa-spinner text-blue-500 text-xl"></i>
              </div>
            </div>
            <div className="mt-4">
              <div className="progress-bar">
                <div
                  className="progress-bar-fill bg-blue-500"
                  style={{ width: `${(stats.activeProjects / Math.max(stats.totalProjects, 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Completed Projects */}
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">
                  {stats.completedProjects}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <i className="fas fa-check-circle text-green-500 text-xl"></i>
              </div>
            </div>
            <div className="mt-4">
              <div className="progress-bar">
                <div
                  className="progress-bar-fill bg-green-500"
                  style={{ width: `${(stats.completedProjects / Math.max(stats.totalProjects, 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Team Members</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">
                  {stats.teamMembers}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <i className="fas fa-users text-purple-500 text-xl"></i>
              </div>
            </div>
            <div className="mt-4 flex -space-x-2">
              {['P', 'D', 'T', 'F'].map((letter, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold border-2 border-white dark:border-gray-800"
                >
                  {letter}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions for Admin/PM */}
      {isAdminOrPM && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <a
            href="/dashboard/projects"
            className="card p-6 hover:border-indigo-500 border-2 border-transparent cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 gradient-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="fas fa-folder-plus text-white text-xl"></i>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white">Manage Projects</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Create and manage projects</p>
              </div>
            </div>
          </a>

          <a
            href="/dashboard/users"
            className="card p-6 hover:border-green-500 border-2 border-transparent cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 gradient-success rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="fas fa-user-plus text-white text-xl"></i>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white">User Management</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Add and manage users</p>
              </div>
            </div>
          </a>

          <a
            href="/dashboard/admin-reports"
            className="card p-6 hover:border-purple-500 border-2 border-transparent cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="fas fa-chart-line text-white text-xl"></i>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white">Admin Reports</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">View all reports</p>
              </div>
            </div>
          </a>
        </div>
      )}

      {/* Projects for Regular Users */}
      {!isAdminOrPM && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Your Projects
          </h2>
          {assignedProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => router.push(`/dashboard/project/${project.id}`)}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
                      <i className="fas fa-folder text-white"></i>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {project.name}
                      </h3>
                      <span className={`badge ${
                        project.status === 'completed' ? 'badge-success' :
                        project.status === 'in_progress' ? 'badge-info' :
                        'badge-warning'
                      }`}>
                        {project.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <i className="fas fa-folder-open text-4xl text-gray-300 dark:text-gray-600 mb-3"></i>
              <p className="text-gray-500 dark:text-gray-400">No projects assigned yet.</p>
            </div>
          )}
        </div>
      )}

      {/* User Profile Card */}
      <div className="card p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Your Profile
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
            <p className="font-medium text-gray-800 dark:text-white mt-1">{user.full_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Role</p>
            <span className="badge badge-purple mt-1 capitalize">
              {user.role.replace('_', ' ')}
            </span>
          </div>
          {user.email && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
              <p className="font-medium text-gray-800 dark:text-white mt-1">{user.email}</p>
            </div>
          )}
          {user.username && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Username</p>
              <p className="font-medium text-gray-800 dark:text-white mt-1">{user.username}</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
