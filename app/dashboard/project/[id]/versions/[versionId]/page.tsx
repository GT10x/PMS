// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

interface Change {
  id: string;
  change_type: 'feature' | 'fix' | 'improvement' | 'breaking' | 'security';
  title: string;
  description: string;
}

interface KnownIssue {
  id: string;
  description: string;
  severity: string;
  resolved: boolean;
}

interface TestCase {
  id: string;
  title: string;
  description: string;
  steps: string[];
  sort_order: number;
  version_test_results: TestResult[];
}

interface TestResult {
  id: string;
  status: 'pending' | 'passed' | 'failed' | 'blocked' | 'skipped';
  notes: string;
  attachments: string[];
  tested_at: string;
}

interface Version {
  id: string;
  version_number: string;
  release_title: string;
  release_summary: string;
  description: string;
  status: string;
  release_date: string;
  deploy_url: string;
  rebuild_requested: boolean;
  rebuild_notes: string;
  project: { id: string; name: string };
}

export default function VersionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const versionId = params.versionId as string;

  const [version, setVersion] = useState<Version | null>(null);
  const [changes, setChanges] = useState<Change[]>([]);
  const [knownIssues, setKnownIssues] = useState<KnownIssue[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rebuildNotes, setRebuildNotes] = useState('');
  const [showRebuildModal, setShowRebuildModal] = useState(false);

  useEffect(() => {
    fetchVersionData();
  }, [versionId]);

  const fetchVersionData = async () => {
    try {
      const response = await fetch(`/api/versions/${versionId}/test-results`);
      if (response.ok) {
        const data = await response.json();
        setVersion(data.version);
        setChanges(data.changes || []);
        setKnownIssues(data.known_issues || []);
        setTestCases(data.test_cases || []);
      }
    } catch (error) {
      console.error('Error fetching version:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTestResult = async (testCaseId: string, status: string, notes: string, attachments: string[] = []) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/versions/${versionId}/test-results`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_case_id: testCaseId,
          status,
          notes,
          attachments
        })
      });

      if (response.ok) {
        fetchVersionData();
      }
    } catch (error) {
      console.error('Error updating test result:', error);
    } finally {
      setSaving(false);
    }
  };

  const requestRebuild = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/versions/${versionId}/test-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_rebuild',
          notes: rebuildNotes
        })
      });

      if (response.ok) {
        setShowRebuildModal(false);
        setRebuildNotes('');
        fetchVersionData();
        alert('Rebuild request sent successfully!');
      }
    } catch (error) {
      console.error('Error requesting rebuild:', error);
    } finally {
      setSaving(false);
    }
  };

  const approveVersion = async () => {
    if (!confirm('Are you sure you want to approve this version for release?')) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/versions/${versionId}/test-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          final_status: 'released'
        })
      });

      if (response.ok) {
        fetchVersionData();
        alert('Version approved and released!');
      }
    } catch (error) {
      console.error('Error approving version:', error);
    } finally {
      setSaving(false);
    }
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'feature': return { icon: 'fa-plus', color: 'text-blue-600', bg: 'bg-blue-100' };
      case 'fix': return { icon: 'fa-wrench', color: 'text-purple-600', bg: 'bg-purple-100' };
      case 'improvement': return { icon: 'fa-arrow-up', color: 'text-green-600', bg: 'bg-green-100' };
      case 'breaking': return { icon: 'fa-exclamation-triangle', color: 'text-red-600', bg: 'bg-red-100' };
      case 'security': return { icon: 'fa-shield-alt', color: 'text-orange-600', bg: 'bg-orange-100' };
      default: return { icon: 'fa-circle', color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'blocked': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'skipped': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const getVersionStatusBadge = (status: string) => {
    switch (status) {
      case 'released': return 'bg-green-500 text-white';
      case 'testing': return 'bg-blue-500 text-white';
      case 'needs_fixes': return 'bg-red-500 text-white';
      case 'in_development': return 'bg-yellow-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!version) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Version not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const allTestsPassed = testCases.length > 0 && testCases.every(tc => tc.version_test_results?.[0]?.status === 'properly_working');
  const hasFailures = testCases.some(tc => tc.version_test_results?.[0]?.status === 'not_working' || tc.version_test_results?.[0]?.status === 'partially_working');

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/dashboard/project/${projectId}/versions`)}
            className="text-indigo-600 hover:text-indigo-800 mb-4 inline-flex items-center gap-2"
          >
            <i className="fas fa-arrow-left"></i> Back to Versions
          </button>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-gray-500 dark:text-gray-400 text-sm">Version</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">v{version.version_number}</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>
                    <i className="fas fa-calendar mr-1"></i>
                    {new Date(version.release_date).toLocaleString()}
                  </span>
                  {version.deploy_url && (
                    <a href={version.deploy_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                      <i className="fas fa-external-link-alt mr-1"></i> View Deploy
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${getVersionStatusBadge(version.status)}`}>
                  {version.status}
                </span>
              </div>
            </div>

            {/* Release Title & Summary */}
            <div className="mt-6">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {version.release_title || `Version ${version.version_number}`}
              </h1>
              {version.release_summary && (
                <p className="text-gray-600 dark:text-gray-400">{version.release_summary}</p>
              )}
            </div>
          </div>
        </div>

        {/* What's New Section */}
        {changes.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-bold text-amber-800 dark:text-amber-200 mb-4">
              What's New in v{version.version_number}
            </h2>
            <div className="space-y-3">
              {changes.map((change) => {
                const { icon, color } = getChangeIcon(change.change_type);
                return (
                  <div key={change.id} className="flex items-start gap-3">
                    <i className={`fas ${icon} ${color} mt-1`}></i>
                    <div>
                      <span className={`font-medium ${color} capitalize`}>{change.change_type}:</span>
                      <span className="text-gray-800 dark:text-gray-200 ml-2">{change.title}</span>
                      {change.description && (
                        <span className="text-gray-600 dark:text-gray-400 ml-1">- {change.description}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Known Issues Section */}
        {knownIssues.length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-bold text-orange-800 dark:text-orange-200 mb-4 flex items-center gap-2">
              <i className="fas fa-exclamation-triangle"></i> Known Issues
            </h2>
            <ul className="space-y-2">
              {knownIssues.map((issue) => (
                <li key={issue.id} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <i className="fas fa-star text-orange-500 mt-1 text-sm"></i>
                  <span>{issue.description}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Test Instructions Section */}
        {testCases.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Test Instructions</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Complete each test case and provide your feedback
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-1/3">
                      Test Instructions
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-1/3">
                      Tester Notes
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-40">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-40">
                      Upload Docs
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {testCases.map((testCase, index) => {
                    const result = testCase.version_test_results?.[0];
                    return (
                      <TestCaseRow
                        key={testCase.id}
                        testCase={testCase}
                        index={index}
                        result={result}
                        onUpdate={updateTestResult}
                        saving={saving}
                        versionId={versionId}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Save Test Results Button */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  alert('Test results saved successfully!');
                  fetchVersionData();
                }}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium flex items-center gap-2 transition disabled:opacity-50"
              >
                <i className="fas fa-save"></i> Save Test Results for v{version.version_number}
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-end mb-8">
          {version.status === 'testing' && (
            <>
              {hasFailures && (
                <button
                  onClick={() => setShowRebuildModal(true)}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium flex items-center gap-2 transition"
                >
                  <i className="fas fa-redo"></i> Request Rebuild
                </button>
              )}
              {allTestsPassed && (
                <button
                  onClick={approveVersion}
                  disabled={saving}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium flex items-center gap-2 transition disabled:opacity-50"
                >
                  <i className="fas fa-check-circle"></i> Approve & Release
                </button>
              )}
            </>
          )}
        </div>

        {/* Rebuild Modal */}
        {showRebuildModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Request Rebuild
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Describe the issues found and what needs to be fixed:
              </p>
              <textarea
                value={rebuildNotes}
                onChange={(e) => setRebuildNotes(e.target.value)}
                placeholder="Enter detailed notes for the developer..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-32 mb-4"
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowRebuildModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={requestRebuild}
                  disabled={saving || !rebuildNotes.trim()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-50"
                >
                  {saving ? 'Sending...' : 'Send Rebuild Request'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// Test Case Row Component
function TestCaseRow({ testCase, index, result, onUpdate, saving, versionId }) {
  const [notes, setNotes] = useState(result?.notes || '');
  const [status, setStatus] = useState(result?.status || 'pending');
  const [attachments, setAttachments] = useState<string[]>(result?.attachments || []);
  const [uploading, setUploading] = useState(false);

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    onUpdate(testCase.id, newStatus, notes, attachments);
  };

  const handleNotesBlur = () => {
    if (notes !== (result?.notes || '')) {
      onUpdate(testCase.id, status, notes, attachments);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const { url } = await response.json();
        const newAttachments = [...attachments, url];
        setAttachments(newAttachments);
        onUpdate(testCase.id, status, notes, newAttachments);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadgeColor = (s: string) => {
    switch (s) {
      case 'properly_working': return 'bg-green-100 text-green-800 border-green-300';
      case 'not_working': return 'bg-red-100 text-red-800 border-red-300';
      case 'partially_working': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <td className="px-6 py-4 align-top">
        <div className="font-medium text-gray-900 dark:text-white mb-2">
          {index + 1}. {testCase.title}
        </div>
        {testCase.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{testCase.description}</p>
        )}
        {testCase.steps && testCase.steps.length > 0 && (
          <ol className="text-sm text-gray-600 dark:text-gray-400 list-decimal list-inside space-y-1">
            {testCase.steps.map((step: string, i: number) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        )}
      </td>
      <td className="px-6 py-4 align-top">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Enter your testing notes here..."
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-24 resize-none"
        />
      </td>
      <td className="px-6 py-4 align-top">
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={saving}
          className={`w-full px-3 py-2 text-sm border rounded-lg ${getStatusBadgeColor(status)} dark:bg-gray-700 dark:text-white`}
        >
          <option value="pending">Select status</option>
          <option value="properly_working">Properly Working</option>
          <option value="not_working">Not Working</option>
          <option value="partially_working">Partially Working</option>
        </select>
      </td>
      <td className="px-6 py-4 align-top">
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg cursor-pointer transition">
          <i className={`fas ${uploading ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>
          Choose File
          <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
        </label>
        {attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {attachments.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline block truncate">
                <i className="fas fa-file mr-1"></i> Attachment {i + 1}
              </a>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}
