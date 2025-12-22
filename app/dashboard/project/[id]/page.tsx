'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  start_date: string | null;
  created_at: string;
}

export default function ProjectDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProject();
  }, []);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/view`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
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

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      not_started: 'badge-info',
      in_progress: 'badge-warning',
      on_hold: 'badge-purple',
      completed: 'badge-success',
      cancelled: 'badge-danger',
    };
    return badges[status] || 'badge-info';
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, string> = {
      low: 'badge-info',
      medium: 'badge-warning',
      high: 'badge-danger',
      critical: 'badge-danger',
    };
    return badges[priority] || 'badge-info';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.push('/dashboard/projects')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <i className="fas fa-arrow-left text-gray-500"></i>
            </button>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{project.name}</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 ml-11">{project.description || 'No description'}</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="card mb-6 p-1">
        <div className="flex gap-1">
          <a
            href={`/dashboard/project/${projectId}`}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-medium text-sm"
          >
            <i className="fas fa-home"></i>
            Overview
          </a>
          <a
            href={`/dashboard/project/${projectId}/reports`}
            className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors"
          >
            <i className="fas fa-bug"></i>
            Reports
          </a>
          <a
            href={`/dashboard/project/${projectId}/versions`}
            className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors"
          >
            <i className="fas fa-code-branch"></i>
            Versions
          </a>
          <a
            href={`/dashboard/project/${projectId}/chat`}
            className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors"
          >
            <i className="fas fa-comments"></i>
            Chat
          </a>
        </div>
      </div>

      {/* Project Info Card */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Project Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Status</p>
            <span className={`badge ${getStatusBadge(project.status)} capitalize`}>
              {project.status.replace('_', ' ')}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Priority</p>
            <span className={`badge ${getPriorityBadge(project.priority)} capitalize`}>
              {project.priority}
            </span>
          </div>
          {project.start_date && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Start Date</p>
              <p className="text-base font-medium text-gray-800 dark:text-white">
                {new Date(project.start_date).toLocaleDateString()}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Created</p>
            <p className="text-base font-medium text-gray-800 dark:text-white">
              {new Date(project.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a
          href={`/dashboard/project/${projectId}/reports`}
          className="card p-6 hover:shadow-lg transition-shadow group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <i className="fas fa-bug text-orange-600 dark:text-orange-400 text-xl"></i>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">Reports & Issues</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Track bugs, features, and improvements</p>
            </div>
            <i className="fas fa-chevron-right text-gray-400 ml-auto"></i>
          </div>
        </a>

        <a
          href={`/dashboard/project/${projectId}/versions`}
          className="card p-6 hover:shadow-lg transition-shadow group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <i className="fas fa-code-branch text-indigo-600 dark:text-indigo-400 text-xl"></i>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">Version Testing</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Track testing progress for each version</p>
            </div>
            <i className="fas fa-chevron-right text-gray-400 ml-auto"></i>
          </div>
        </a>

        <a
          href={`/dashboard/project/${projectId}/chat`}
          className="card p-6 hover:shadow-lg transition-shadow group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <i className="fas fa-comments text-green-600 dark:text-green-400 text-xl"></i>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">Team Chat</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Collaborate with your team members</p>
            </div>
            <i className="fas fa-chevron-right text-gray-400 ml-auto"></i>
          </div>
        </a>
      </div>
    </DashboardLayout>
  );
}
