'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

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
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
        return;
      }
      fetchProject();
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/login');
    }
  };

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/view`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      } else {
        alert('You do not have access to this project');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-sm text-gray-500 mt-1">{project.description}</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 py-3">
            <a
              href={`/dashboard/project/${projectId}`}
              className="text-indigo-600 border-b-2 border-indigo-600 px-1 pb-3 text-sm font-medium"
            >
              <i className="fas fa-home mr-2"></i>
              Overview
            </a>
            <a
              href={`/dashboard/project/${projectId}/reports`}
              className="text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300 px-1 pb-3 text-sm font-medium"
            >
              <i className="fas fa-bug mr-2"></i>
              Reports
            </a>
            <a
              href={`/dashboard/project/${projectId}/versions`}
              className="text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300 px-1 pb-3 text-sm font-medium"
            >
              <i className="fas fa-code-branch mr-2"></i>
              Versions
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
                {project.status.replace('_', ' ')}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Priority</p>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 capitalize">
                {project.priority}
              </span>
            </div>
            {project.start_date && (
              <div>
                <p className="text-sm text-gray-500">Start Date</p>
                <p className="text-base font-medium text-gray-900">
                  {new Date(project.start_date).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Placeholder for future features */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Project Dashboard
          </h2>
          <p className="text-gray-600">
            Project dashboard features (tasks, documents, timeline) will be added here.
          </p>
        </div>
      </main>
    </div>
  );
}
