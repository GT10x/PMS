'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Breadcrumb from '@/components/Breadcrumb';
import { ProjectCardSkeleton } from '@/components/LoadingSkeleton';
import Tooltip from '@/components/Tooltip';
import ProjectNavTabs from '@/components/ProjectNavTabs';
import { useProjectPermissions } from '@/hooks/useProjectPermissions';

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
  const { hasAccess } = useProjectPermissions(projectId);
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
        <Breadcrumb items={[{ label: 'Projects', href: '/dashboard/projects' }, { label: 'Loading...' }]} />
        <div className="space-y-6">
          <ProjectCardSkeleton />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ProjectCardSkeleton />
            <ProjectCardSkeleton />
            <ProjectCardSkeleton />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <DashboardLayout>
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Projects', href: '/dashboard/projects', icon: 'fas fa-folder' },
        { label: project.name }
      ]} />

      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{project.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{project.description || 'No description'}</p>
        </div>
        <Tooltip content="Go back to projects">
          <button
            onClick={() => router.push('/dashboard/projects')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <i className="fas fa-arrow-left text-gray-500"></i>
          </button>
        </Tooltip>
      </div>

      <ProjectNavTabs projectId={projectId} activeTab="overview" hasAccess={hasAccess} />

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
