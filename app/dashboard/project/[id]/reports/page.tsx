'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

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
  created_at: string;
  reported_by_user: { full_name: string };
  assigned_to_user?: { full_name: string };
  version?: { version_number: string };
}

export default function ProjectReportsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchReports();
  }, [statusFilter, typeFilter]);

  const fetchReports = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);

      const response = await fetch(`/api/projects/${projectId}/reports?${params}`);
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
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
      open: '🔵 OPEN',
      in_progress: '⏳ IN PROGRESS',
      resolved: '✅ RESOLVED',
      wont_fix: '❌ WON\'T FIX'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles]}`}>
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
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[priority as keyof typeof styles]} uppercase`}>
        {priority}
      </span>
    );
  };

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
                <i className="fas fa-bug mr-2 text-red-600"></i>
                Reports & Issues
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Track bugs, features, and improvements
              </p>
            </div>
            <button
              onClick={() => router.push(`/dashboard/project/${projectId}`)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Back to Project
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <i className="fas fa-filter text-gray-600"></i>
              <span className="font-medium text-gray-700">Filters:</span>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="bug">Bugs</option>
              <option value="feature">Features</option>
              <option value="improvement">Improvements</option>
              <option value="task">Tasks</option>
            </select>

            <button
              onClick={() => {
                setStatusFilter('all');
                setTypeFilter('all');
              }}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 transition"
            >
              <i className="fas fa-redo"></i> Reset
            </button>
          </div>
        </div>

        {/* Reports List */}
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <i className="fas fa-inbox text-6xl text-gray-300 mb-4"></i>
              <p className="text-gray-600 text-lg">No reports found</p>
              <p className="text-gray-500 text-sm mt-2">Click the + button to create your first report</p>
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getTypeEmoji(report.type)}</span>
                      <h3 className="text-xl font-bold text-gray-900">{report.title}</h3>
                      {getStatusBadge(report.status)}
                      {report.priority !== 'medium' && getPriorityBadge(report.priority)}
                    </div>

                    <p className="text-gray-700 mb-3 line-clamp-2">{report.description}</p>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      {report.version && (
                        <span><i className="fas fa-tag"></i> {report.version.version_number}</span>
                      )}
                      <span><i className="fas fa-user"></i> {report.reported_by_user.full_name}</span>
                      {report.browser && (
                        <span><i className="fas fa-globe"></i> {report.browser}</span>
                      )}
                      {report.device && (
                        <span><i className="fas fa-mobile-alt"></i> {report.device}</span>
                      )}
                      <span>
                        <i className="fas fa-clock"></i>{' '}
                        {new Date(report.created_at).toLocaleString()}
                      </span>
                      {report.attachments.length > 0 && (
                        <span><i className="fas fa-paperclip"></i> {report.attachments.length} file(s)</span>
                      )}
                    </div>
                  </div>

                  <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2">
                    <i className="fas fa-eye"></i>
                    View
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-8 right-8 bg-orange-500 hover:bg-orange-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 z-50"
        title="Create New Report"
      >
        <i className="fas fa-plus text-xl"></i>
      </button>

      {/* Create Report Modal - TODO: Implement */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold mb-4">Create New Report</h3>
            <p className="text-gray-600">Form coming next...</p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* View Report Modal - TODO: Implement */}
      {selectedReport && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span className="text-2xl">{getTypeEmoji(selectedReport.type)}</span>
                {selectedReport.title}
              </h3>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <p className="text-gray-700 mb-4">{selectedReport.description}</p>
            <button
              onClick={() => setSelectedReport(null)}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
