'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Breadcrumb from '@/components/Breadcrumb';
import { PageSkeleton } from '@/components/LoadingSkeleton';
import Pagination from '@/components/Pagination';
import { NoProjectsEmptyState } from '@/components/EmptyState';
import Tooltip from '@/components/Tooltip';
import Button from '@/components/Button';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  start_date: string | null;
  created_at: string;
  created_by: string;
  member_count?: number;
  members?: ProjectMember[];
}

interface ProjectMember {
  user_id: string;
  full_name: string;
  role: string;
}

interface User {
  id: string;
  full_name: string;
  role: string;
}

const ITEMS_PER_PAGE = 10;

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    start_date: '',
    member_ids: [] as string[],
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pagination
  const totalPages = Math.ceil(projects.length / ITEMS_PER_PAGE);
  const paginatedProjects = projects.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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
      const data = await response.json();
      if (!data.user.is_admin && data.user.role !== 'project_manager') {
        router.push('/dashboard');
        return;
      }
      fetchProjects();
      fetchUsers();
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/login');
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          team_members: formData.member_ids,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create project');
        setSubmitting(false);
        return;
      }

      setSuccess('Project created successfully');
      setShowAddModal(false);
      resetForm();
      fetchProjects();
      setSubmitting(false);
    } catch (error) {
      setError('Failed to create project');
      setSubmitting(false);
    }
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${selectedProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          team_members: formData.member_ids,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update project');
        setSubmitting(false);
        return;
      }

      setSuccess('Project updated successfully');
      setShowEditModal(false);
      setSelectedProject(null);
      fetchProjects();
      setSubmitting(false);
    } catch (error) {
      setError('Failed to update project');
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Project deleted successfully');
        fetchProjects();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete project');
      }
    } catch (error) {
      setError('Failed to delete project');
    }
  };

  const openEditModal = (project: Project) => {
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
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      status: 'planning',
      priority: 'medium',
      start_date: '',
      member_ids: [],
    });
    setError('');
  };

  const toggleMember = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      member_ids: prev.member_ids.includes(userId)
        ? prev.member_ids.filter(id => id !== userId)
        : [...prev.member_ids, userId]
    }));
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      completed: 'badge-success',
      in_progress: 'badge-info',
      planning: 'badge-warning',
      on_hold: 'badge-danger',
      review: 'badge-purple',
    };
    return badges[status] || 'badge-info';
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, string> = {
      critical: 'badge-danger',
      high: 'badge-warning',
      medium: 'badge-info',
      low: 'badge-success',
    };
    return badges[priority] || 'badge-info';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Breadcrumb items={[{ label: 'Projects' }]} />
        <PageSkeleton type="table" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Projects', icon: 'fas fa-folder' }]} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Projects</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and track your projects</p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          icon="fas fa-plus"
        >
          Add Project
        </Button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl flex items-center gap-2 animate-fadeIn">
          <i className="fas fa-check-circle"></i>
          {success}
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl flex items-center gap-2 animate-fadeIn">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      {/* Projects Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Team Members</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProjects.map((project) => (
                <tr key={project.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
                        <i className="fas fa-folder text-white"></i>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white">{project.name}</p>
                        {project.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadge(project.status)}`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getPriorityBadge(project.priority)}`}>
                      {project.priority}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center">
                      <div className="flex -space-x-2">
                        {project.members?.slice(0, 3).map((member, i) => (
                          <Tooltip key={i} content={member.full_name}>
                            <div
                              className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold border-2 border-white dark:border-gray-800"
                            >
                              {member.full_name.charAt(0)}
                            </div>
                          </Tooltip>
                        ))}
                      </div>
                      {(project.members?.length || 0) > 3 && (
                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                          +{(project.members?.length || 0) - 3}
                        </span>
                      )}
                      {!project.members?.length && (
                        <span className="text-sm text-gray-400">No members</span>
                      )}
                    </div>
                  </td>
                  <td className="text-gray-600 dark:text-gray-400">
                    {new Date(project.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip content="View project">
                        <button
                          onClick={() => router.push(`/dashboard/project/${project.id}`)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                      </Tooltip>
                      <Tooltip content="View versions">
                        <button
                          onClick={() => router.push(`/dashboard/project/${project.id}/versions`)}
                          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                        >
                          <i className="fas fa-code-branch"></i>
                        </button>
                      </Tooltip>
                      <Tooltip content="Edit project">
                        <button
                          onClick={() => openEditModal(project)}
                          className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                      </Tooltip>
                      <Tooltip content="Delete project">
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {projects.length > 0 && (
          <div className="p-4 border-t dark:border-gray-700">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={projects.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Empty State */}
      {projects.length === 0 && (
        <NoProjectsEmptyState onCreateProject={() => { resetForm(); setShowAddModal(true); }} />
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="modal-overlay" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>
          <div className="modal-content p-6 max-w-2xl animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {showAddModal ? 'Add New Project' : 'Edit Project'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {showAddModal ? 'Create a new project and assign team members' : 'Update project details'}
                </p>
              </div>
              <button
                onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <i className="fas fa-times text-gray-500"></i>
              </button>
            </div>

            <form onSubmit={showAddModal ? handleAddProject : handleEditProject} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="Enter project name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  rows={3}
                  placeholder="Enter project description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input-field"
                  >
                    <option value="planning">Planning</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Assign Team Members
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  {users.map((user) => (
                    <label
                      key={user.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        formData.member_ids.includes(user.id)
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-500'
                          : 'bg-white dark:bg-gray-800 border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                      }`}
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
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fas fa-spinner animate-spin"></i>
                      {showAddModal ? 'Creating...' : 'Updating...'}
                    </span>
                  ) : (
                    showAddModal ? 'Create Project' : 'Update Project'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
