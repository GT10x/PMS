'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Breadcrumb from '@/components/Breadcrumb';
import { PageSkeleton } from '@/components/LoadingSkeleton';
import Tooltip from '@/components/Tooltip';
import Pagination from '@/components/Pagination';

interface Report {
  id: string;
  title: string;
  description: string;
  type: 'bug' | 'feature' | 'improvement' | 'task';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'wont_fix';
  browser?: string;
  device?: string;
  attachments: string[];
  dev_notes?: string;
  created_at: string;
  reported_by_user: { full_name: string };
  assigned_to_user?: { full_name: string; id: string };
  version?: { version_number: string };
  project: { id: string; name: string };
}

interface User {
  id: string;
  full_name: string;
  role: string;
}

interface Project {
  id: string;
  name: string;
}

export default function AdminReportsPage() {
  const router = useRouter();

  const [reports, setReports] = useState<Report[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    critical: 0,
    high: 0
  });

  // Edit state
  const [editData, setEditData] = useState({
    status: '',
    assigned_to: '',
    dev_notes: ''
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchReports(),
        fetchProjects(),
        fetchUsers()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      // Fetch reports from all projects
      const projectsResponse = await fetch('/api/projects');
      if (!projectsResponse.ok) return;

      const projectsData = await projectsResponse.json();
      const allProjects = projectsData.projects || [];

      const allReports: Report[] = [];
      for (const project of allProjects) {
        const response = await fetch(`/api/projects/${project.id}/reports`);
        if (response.ok) {
          const data = await response.json();
          const projectReports = (data.reports || []).map((r: any) => ({
            ...r,
            project: { id: project.id, name: project.name }
          }));
          allReports.push(...projectReports);
        }
      }

      setReports(allReports);
      calculateStats(allReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
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

  const calculateStats = (reportsList: Report[]) => {
    const stats = {
      total: reportsList.length,
      open: reportsList.filter(r => r.status === 'open').length,
      in_progress: reportsList.filter(r => r.status === 'in_progress').length,
      resolved: reportsList.filter(r => r.status === 'resolved').length,
      critical: reportsList.filter(r => r.priority === 'critical').length,
      high: reportsList.filter(r => r.priority === 'high').length
    };
    setStats(stats);
  };

  const getFilteredReports = () => {
    return reports.filter(report => {
      if (statusFilter !== 'all' && report.status !== statusFilter) return false;
      if (typeFilter !== 'all' && report.type !== typeFilter) return false;
      if (priorityFilter !== 'all' && report.priority !== priorityFilter) return false;
      if (projectFilter !== 'all' && report.project.id !== projectFilter) return false;
      if (searchQuery && !report.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !report.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setEditData({
      status: report.status,
      assigned_to: report.assigned_to_user?.id || '',
      dev_notes: report.dev_notes || ''
    });
  };

  const handleUpdateReport = async () => {
    if (!selectedReport) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/projects/${selectedReport.project.id}/reports/${selectedReport.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editData.status,
          assigned_to: editData.assigned_to || null,
          dev_notes: editData.dev_notes
        })
      });

      if (response.ok) {
        alert('Report updated successfully!');
        setSelectedReport(null);
        fetchReports();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Failed to update report');
    } finally {
      setUpdating(false);
    }
  };

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case 'bug': return '🐛';
      case 'feature': return '💡';
      case 'improvement': return '⬆️';
      case 'task': return '📋';
      default: return '📝';
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      open: 'badge-info',
      in_progress: 'badge-warning',
      resolved: 'badge-success',
      wont_fix: 'badge-purple',
    };
    const labels: Record<string, string> = {
      open: 'Open',
      in_progress: 'In Progress',
      resolved: 'Resolved',
      wont_fix: "Won't Fix"
    };
    return (
      <span className={`badge ${badges[status] || 'badge-info'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, string> = {
      low: 'badge-info',
      medium: 'badge-warning',
      high: 'badge-danger',
      critical: 'badge-danger',
    };
    return (
      <span className={`badge ${badges[priority] || 'badge-info'} uppercase`}>
        {priority}
      </span>
    );
  };

  const filteredReports = getFilteredReports();

  // Pagination
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <DashboardLayout>
        <Breadcrumb items={[{ label: 'Admin Reports' }]} />
        <PageSkeleton type="table" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Admin Reports', icon: 'fas fa-chart-line' }]} />

      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            <i className="fas fa-chart-line mr-2 text-purple-500"></i>
            Admin Reports Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage all reports across all projects</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Reports</p>
            </div>
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <i className="fas fa-clipboard-list text-gray-600 dark:text-gray-400"></i>
            </div>
          </div>
        </div>
        <div className="stats-card border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Open</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <i className="fas fa-folder-open text-blue-600"></i>
            </div>
          </div>
        </div>
        <div className="stats-card border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-yellow-600">{stats.in_progress}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">In Progress</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <i className="fas fa-spinner text-yellow-600"></i>
            </div>
          </div>
        </div>
        <div className="stats-card border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Resolved</p>
            </div>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <i className="fas fa-check-circle text-green-600"></i>
            </div>
          </div>
        </div>
        <div className="stats-card border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Critical</p>
            </div>
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <i className="fas fa-exclamation-triangle text-red-600"></i>
            </div>
          </div>
        </div>
        <div className="stats-card border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-orange-600">{stats.high}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">High Priority</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <i className="fas fa-arrow-up text-orange-600"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="wont_fix">Won't Fix</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">All Types</option>
            <option value="bug">Bugs</option>
            <option value="feature">Features</option>
            <option value="improvement">Improvements</option>
            <option value="task">Tasks</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          <button
            onClick={() => {
              setProjectFilter('all');
              setStatusFilter('all');
              setTypeFilter('all');
              setPriorityFilter('all');
              setSearchQuery('');
            }}
            className="btn-secondary"
          >
            <i className="fas fa-redo mr-1"></i> Reset
          </button>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search reports by title or description..."
          className="input-field"
        />
      </div>

      {/* Reports Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Type</th>
                <th>Title</th>
                <th>Project</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Reported By</th>
                <th>Assigned To</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <i className="fas fa-inbox text-4xl text-gray-300 dark:text-gray-600 mb-3"></i>
                    <p className="text-gray-500 dark:text-gray-400">No reports found</p>
                  </td>
                </tr>
              ) : (
                paginatedReports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <span className="text-xl">{getTypeEmoji(report.type)}</span>
                    </td>
                    <td>
                      <div className="text-sm font-medium text-gray-800 dark:text-white max-w-xs truncate">
                        {report.title}
                      </div>
                    </td>
                    <td className="text-gray-600 dark:text-gray-400">
                      {report.project.name}
                    </td>
                    <td>
                      {getPriorityBadge(report.priority)}
                    </td>
                    <td>
                      {getStatusBadge(report.status)}
                    </td>
                    <td className="text-gray-600 dark:text-gray-400">
                      {report.reported_by_user.full_name}
                    </td>
                    <td className="text-gray-600 dark:text-gray-400">
                      {report.assigned_to_user?.full_name || 'Unassigned'}
                    </td>
                    <td className="text-gray-600 dark:text-gray-400">
                      {new Date(report.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex items-center justify-end">
                        <Tooltip content="View and manage report">
                          <button
                            onClick={() => handleViewReport(report)}
                            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredReports.length > 0 && (
          <div className="p-4 border-t dark:border-gray-700">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredReports.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* View/Manage Report Modal */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal-content max-w-4xl animate-fadeIn" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{getTypeEmoji(selectedReport.type)}</span>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedReport.title}</h3>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {getStatusBadge(selectedReport.status)}
                  {getPriorityBadge(selectedReport.priority)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <i className="fas fa-folder mr-1"></i>
                  Project: {selectedReport.project.name}
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <i className="fas fa-times text-gray-500"></i>
              </button>
            </div>

            {/* Report Details */}
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</h4>
                <p className="text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 p-4 rounded-xl whitespace-pre-wrap">
                  {selectedReport.description}
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reported By</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedReport.reported_by_user.full_name}</p>
                </div>
                {selectedReport.assigned_to_user && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Assigned To</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedReport.assigned_to_user.full_name}</p>
                  </div>
                )}
                {selectedReport.version && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Version</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedReport.version.version_number}</p>
                  </div>
                )}
                {selectedReport.browser && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Browser</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedReport.browser}</p>
                  </div>
                )}
                {selectedReport.device && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Device</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedReport.device}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Created</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(selectedReport.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Attachments */}
              {selectedReport.attachments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Attachments ({selectedReport.attachments.length})</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedReport.attachments.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-gray-300 dark:border-gray-600 rounded-xl p-3 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition flex items-center gap-2"
                      >
                        <i className="fas fa-paperclip text-purple-600"></i>
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">Attachment {index + 1}</span>
                        <i className="fas fa-external-link-alt text-xs text-gray-400 ml-auto"></i>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Developer Notes */}
              {selectedReport.dev_notes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Developer Notes</h4>
                  <p className="text-gray-900 dark:text-gray-100 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-xl whitespace-pre-wrap">
                    {selectedReport.dev_notes}
                  </p>
                </div>
              )}

              {/* Management Section */}
              <div className="border-t dark:border-gray-700 pt-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  <i className="fas fa-cog mr-2"></i>
                  Manage Report
                </h4>
                <div className="space-y-4">
                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                    <select
                      value={editData.status}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                      className="input-field"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="wont_fix">Won't Fix</option>
                    </select>
                  </div>

                  {/* Assign To */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assign To</label>
                    <select
                      value={editData.assigned_to}
                      onChange={(e) => setEditData({ ...editData, assigned_to: e.target.value })}
                      className="input-field"
                    >
                      <option value="">Unassigned</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name} ({user.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Developer Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Developer Notes</label>
                    <textarea
                      value={editData.dev_notes}
                      onChange={(e) => setEditData({ ...editData, dev_notes: e.target.value })}
                      rows={4}
                      className="input-field"
                      placeholder="Add notes about the fix, workarounds, or technical details..."
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="btn-secondary flex-1"
                  disabled={updating}
                >
                  Close
                </button>
                <button
                  onClick={handleUpdateReport}
                  disabled={updating}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {updating ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fas fa-spinner animate-spin"></i>
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fas fa-save"></i>
                      Save Changes
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
