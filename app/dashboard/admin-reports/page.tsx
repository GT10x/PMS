'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
        return;
      }
      const user = await response.json();
      if (!user.is_admin && user.role !== 'project_manager') {
        router.push('/dashboard');
        return;
      }
      fetchData();
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/login');
    }
  };

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
    const styles = {
      open: 'bg-blue-100 text-blue-800 border-blue-300',
      in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      resolved: 'bg-green-100 text-green-800 border-green-300',
      wont_fix: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    const labels = {
      open: 'OPEN',
      in_progress: 'IN PROGRESS',
      resolved: 'RESOLVED',
      wont_fix: 'WON\'T FIX'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: 'bg-gray-100 text-gray-800 border-gray-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      critical: 'bg-red-100 text-red-800 border-red-300'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${styles[priority as keyof typeof styles]} uppercase`}>
        {priority}
      </span>
    );
  };

  const filteredReports = getFilteredReports();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                <i className="fas fa-chart-line mr-2 text-purple-600"></i>
                Admin Reports Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage all reports across all projects
              </p>
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

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-600 mt-1">Total Reports</div>
          </div>
          <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-200 p-4">
            <div className="text-2xl font-bold text-blue-700">{stats.open}</div>
            <div className="text-xs text-blue-600 mt-1">Open</div>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200 p-4">
            <div className="text-2xl font-bold text-yellow-700">{stats.in_progress}</div>
            <div className="text-xs text-yellow-600 mt-1">In Progress</div>
          </div>
          <div className="bg-green-50 rounded-lg shadow-sm border border-green-200 p-4">
            <div className="text-2xl font-bold text-green-700">{stats.resolved}</div>
            <div className="text-xs text-green-600 mt-1">Resolved</div>
          </div>
          <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-4">
            <div className="text-2xl font-bold text-red-700">{stats.critical}</div>
            <div className="text-xs text-red-600 mt-1">Critical</div>
          </div>
          <div className="bg-orange-50 rounded-lg shadow-sm border border-orange-200 p-4">
            <div className="text-2xl font-bold text-orange-700">{stats.high}</div>
            <div className="text-xs text-orange-600 mt-1">High Priority</div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              className="px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg text-sm"
            >
              <i className="fas fa-redo mr-1"></i> Reset
            </button>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports by title or description..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Reports Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Reported By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Assigned To</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No reports found
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xl">{getTypeEmoji(report.type)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                          {report.title}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs text-gray-600">{report.project.name}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getPriorityBadge(report.priority)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(report.status)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs text-gray-600">{report.reported_by_user.full_name}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs text-gray-600">
                          {report.assigned_to_user?.full_name || 'Unassigned'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs text-gray-600">
                          {new Date(report.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => handleViewReport(report)}
                          className="text-purple-600 hover:text-purple-800 text-sm"
                        >
                          <i className="fas fa-eye mr-1"></i>
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View/Manage Report Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{getTypeEmoji(selectedReport.type)}</span>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedReport.title}</h3>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {getStatusBadge(selectedReport.status)}
                  {getPriorityBadge(selectedReport.priority)}
                </div>
                <div className="text-sm text-gray-600">
                  <i className="fas fa-folder mr-1"></i>
                  Project: {selectedReport.project.name}
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {/* Report Details */}
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
                <p className="text-gray-900 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                  {selectedReport.description}
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Reported By</p>
                  <p className="text-sm font-medium text-gray-900">{selectedReport.reported_by_user.full_name}</p>
                </div>
                {selectedReport.assigned_to_user && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Assigned To</p>
                    <p className="text-sm font-medium text-gray-900">{selectedReport.assigned_to_user.full_name}</p>
                  </div>
                )}
                {selectedReport.version && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Version</p>
                    <p className="text-sm font-medium text-gray-900">{selectedReport.version.version_number}</p>
                  </div>
                )}
                {selectedReport.browser && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Browser</p>
                    <p className="text-sm font-medium text-gray-900">{selectedReport.browser}</p>
                  </div>
                )}
                {selectedReport.device && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Device</p>
                    <p className="text-sm font-medium text-gray-900">{selectedReport.device}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Created</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(selectedReport.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Attachments */}
              {selectedReport.attachments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Attachments ({selectedReport.attachments.length})</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedReport.attachments.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-gray-300 rounded-lg p-3 hover:border-purple-500 hover:bg-purple-50 transition flex items-center gap-2"
                      >
                        <i className="fas fa-paperclip text-purple-600"></i>
                        <span className="text-sm text-gray-700 truncate">Attachment {index + 1}</span>
                        <i className="fas fa-external-link-alt text-xs text-gray-400 ml-auto"></i>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Developer Notes */}
              {selectedReport.dev_notes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Developer Notes</h4>
                  <p className="text-gray-900 bg-yellow-50 border border-yellow-200 p-4 rounded-lg whitespace-pre-wrap">
                    {selectedReport.dev_notes}
                  </p>
                </div>
              )}

              {/* Management Section */}
              <div className="border-t pt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  <i className="fas fa-cog mr-2"></i>
                  Manage Report
                </h4>
                <div className="space-y-4">
                  {/* Status */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                    <select
                      value={editData.status}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="wont_fix">Won't Fix</option>
                    </select>
                  </div>

                  {/* Assign To */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Assign To</label>
                    <select
                      value={editData.assigned_to}
                      onChange={(e) => setEditData({ ...editData, assigned_to: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Developer Notes</label>
                    <textarea
                      value={editData.dev_notes}
                      onChange={(e) => setEditData({ ...editData, dev_notes: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Add notes about the fix, workarounds, or technical details..."
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Close
                </button>
                <button
                  onClick={handleUpdateReport}
                  className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition flex items-center gap-2"
                >
                  <i className="fas fa-save"></i>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
