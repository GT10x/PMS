'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Breadcrumb from '@/components/Breadcrumb';
import { CardSkeleton } from '@/components/LoadingSkeleton';
import { NoVersionsEmptyState } from '@/components/EmptyState';
import Tooltip from '@/components/Tooltip';
import Button from '@/components/Button';

interface TestCase {
  id: string;
  test_number: number;
  title: string;
  instructions: string;
  steps: string[];
  results?: TestResult[];
}

interface TestResult {
  id: string;
  status: 'pass' | 'fail' | 'pending';
  notes?: string;
  tested_by_user?: { full_name: string };
  tested_at?: string;
}

interface Version {
  id: string;
  version_number: string;
  release_date: string;
  description?: string;
  status: 'testing' | 'stable' | 'deprecated';
  test_cases?: TestCase[];
  created_at: string;
}

export default function ProjectVersionsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [expandedTestCase, setExpandedTestCase] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create version form
  const [versionForm, setVersionForm] = useState({
    version_number: '',
    release_date: new Date().toISOString().split('T')[0],
    description: '',
    test_cases: [] as Array<{ title: string; instructions: string; steps: string[] }>
  });

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/versions`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions || []);
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTestCase = () => {
    setVersionForm({
      ...versionForm,
      test_cases: [
        ...versionForm.test_cases,
        { title: '', instructions: '', steps: [''] }
      ]
    });
  };

  const updateTestCase = (index: number, field: string, value: any) => {
    const updated = [...versionForm.test_cases];
    updated[index] = { ...updated[index], [field]: value };
    setVersionForm({ ...versionForm, test_cases: updated });
  };

  const addStep = (tcIndex: number) => {
    const updated = [...versionForm.test_cases];
    updated[tcIndex].steps.push('');
    setVersionForm({ ...versionForm, test_cases: updated });
  };

  const updateStep = (tcIndex: number, stepIndex: number, value: string) => {
    const updated = [...versionForm.test_cases];
    updated[tcIndex].steps[stepIndex] = value;
    setVersionForm({ ...versionForm, test_cases: updated });
  };

  const removeStep = (tcIndex: number, stepIndex: number) => {
    const updated = [...versionForm.test_cases];
    updated[tcIndex].steps.splice(stepIndex, 1);
    setVersionForm({ ...versionForm, test_cases: updated });
  };

  const removeTestCase = (index: number) => {
    const updated = [...versionForm.test_cases];
    updated.splice(index, 1);
    setVersionForm({ ...versionForm, test_cases: updated });
  };

  const handleCreateVersion = async () => {
    if (!versionForm.version_number.trim()) {
      alert('Please enter a version number');
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(versionForm)
      });

      if (response.ok) {
        alert('Version created successfully!');
        setShowCreateModal(false);
        setVersionForm({
          version_number: '',
          release_date: new Date().toISOString().split('T')[0],
          description: '',
          test_cases: []
        });
        fetchVersions();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating version:', error);
      alert('Failed to create version');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      testing: 'badge-warning',
      stable: 'badge-success',
      deprecated: 'badge-purple',
    };
    return (
      <span className={`badge ${badges[status] || 'badge-info'} uppercase`}>
        {status}
      </span>
    );
  };

  const getTestResultBadge = (status: string) => {
    const badges: Record<string, string> = {
      pass: 'badge-success',
      fail: 'badge-danger',
      pending: 'badge-info',
    };
    const icons: Record<string, string> = {
      pass: 'fa-check-circle',
      fail: 'fa-times-circle',
      pending: 'fa-clock',
    };
    return (
      <span className={`badge ${badges[status] || 'badge-info'}`}>
        <i className={`fas ${icons[status]} mr-1`}></i>
        {status.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Breadcrumb items={[
          { label: 'Projects', href: '/dashboard/projects' },
          { label: 'Project', href: `/dashboard/project/${projectId}` },
          { label: 'Versions' }
        ]} />
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Projects', href: '/dashboard/projects', icon: 'fas fa-folder' },
        { label: 'Project', href: `/dashboard/project/${projectId}` },
        { label: 'Versions', icon: 'fas fa-code-branch' }
      ]} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            <i className="fas fa-code-branch mr-2 text-indigo-500"></i>
            Version Testing Tracker
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track testing progress for each version release</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          icon="fas fa-plus"
        >
          New Version
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="card mb-6 p-1 overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex gap-1 min-w-max">
          <a
            href={`/dashboard/project/${projectId}`}
            className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors"
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
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-medium text-sm"
          >
            <i className="fas fa-code-branch"></i>
            Versions
          </a>
          <a
            href={`/dashboard/project/${projectId}/modules`}
            className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors"
          >
            <i className="fas fa-cubes"></i>
            Modules
          </a>
          <a
            href={`/dashboard/project/${projectId}/stakeholders`}
            className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors"
          >
            <i className="fas fa-users"></i>
            Stakeholders
          </a>

          <a
            href={`/dashboard/project/${projectId}/flow`}
            className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors"
          >
            <i className="fas fa-project-diagram"></i>
            Flow
          </a>

          <a
            href={`/dashboard/project/${projectId}/chat`}
            className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors"
          >
            <i className="fas fa-comments"></i>
            Chat
          </a>
          <a
            href={`/dashboard/project/${projectId}/settings`}
            className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors"
          >
            <i className="fas fa-cog"></i>
            Settings
          </a>
        </div>
      </div>

      {/* Versions List */}
      <div className="space-y-4">
        {versions.length === 0 ? (
          <NoVersionsEmptyState onCreateVersion={() => setShowCreateModal(true)} />
        ) : (
          versions.map((version) => (
            <div
              key={version.id}
              className="card overflow-hidden"
            >
              {/* Version Header */}
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      onClick={() => setExpandedVersion(expandedVersion === version.id ? null : version.id)}
                      className="cursor-pointer p-2 -m-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <i className={`fas fa-chevron-${expandedVersion === version.id ? 'down' : 'right'} text-gray-400`}></i>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Version {version.version_number}
                      </h3>
                      {version.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{version.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>
                          <i className="fas fa-calendar mr-1"></i>
                          {new Date(version.release_date).toLocaleDateString()}
                        </span>
                        <span>
                          <i className="fas fa-tasks mr-1"></i>
                          {version.test_cases?.length || 0} test cases
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(version.status)}
                    <Tooltip content="Open testing dashboard for this version">
                      <button
                        onClick={() => router.push(`/dashboard/project/${projectId}/versions/${version.id}`)}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-medium text-sm hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center gap-2"
                      >
                        <i className="fas fa-clipboard-check"></i>
                        Open Tester Dashboard
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>

              {/* Test Cases - Expandable */}
              {expandedVersion === version.id && version.test_cases && version.test_cases.length > 0 && (
                <div className="border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <div className="p-6 space-y-3">
                    {version.test_cases.map((testCase) => (
                      <div
                        key={testCase.id}
                        className="card overflow-hidden"
                      >
                        {/* Test Case Header */}
                        <div
                          onClick={() => setExpandedTestCase(expandedTestCase === testCase.id ? null : testCase.id)}
                          className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <i className={`fas fa-chevron-${expandedTestCase === testCase.id ? 'down' : 'right'} text-gray-400 text-sm`}></i>
                              <span className="font-semibold text-gray-700 dark:text-gray-300">Test #{testCase.test_number}</span>
                              <span className="text-gray-900 dark:text-white">{testCase.title}</span>
                            </div>
                            {testCase.results && testCase.results.length > 0 ? (
                              getTestResultBadge(testCase.results[0].status)
                            ) : (
                              getTestResultBadge('pending')
                            )}
                          </div>
                        </div>

                        {/* Test Case Details */}
                        {expandedTestCase === testCase.id && (
                          <div className="border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-4">
                            {/* Instructions */}
                            <div>
                              <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Instructions</h5>
                              <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 p-3 rounded-xl border dark:border-gray-600">
                                {testCase.instructions}
                              </p>
                            </div>

                            {/* Steps */}
                            {testCase.steps && testCase.steps.length > 0 && (
                              <div>
                                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Steps</h5>
                                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 p-3 rounded-xl border dark:border-gray-600">
                                  {testCase.steps.map((step, index) => (
                                    <li key={index}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            )}

                            {/* Test Results */}
                            {testCase.results && testCase.results.length > 0 && (
                              <div>
                                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Test Results</h5>
                                {testCase.results.map((result, index) => (
                                  <div key={index} className="bg-white dark:bg-gray-700 p-3 rounded-xl border dark:border-gray-600 mb-2">
                                    <div className="flex items-center justify-between mb-2">
                                      {getTestResultBadge(result.status)}
                                      {result.tested_by_user && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                          by {result.tested_by_user.full_name}
                                        </span>
                                      )}
                                    </div>
                                    {result.notes && (
                                      <p className="text-sm text-gray-700 dark:text-gray-300">{result.notes}</p>
                                    )}
                                    {result.tested_at && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {new Date(result.tested_at).toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Mark Test Button */}
                            <button className="btn-primary w-full">
                              <i className="fas fa-check-circle mr-2"></i>
                              Mark Test Result
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Test Cases Message */}
              {expandedVersion === version.id && (!version.test_cases || version.test_cases.length === 0) && (
                <div className="border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-6 text-center">
                  <p className="text-gray-500 dark:text-gray-400">No test cases defined for this version</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Version Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content max-w-4xl animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                  <i className="fas fa-code-branch mr-2 text-indigo-500"></i>
                  Create New Version
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Add a new version with test cases</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <i className="fas fa-times text-gray-500"></i>
              </button>
            </div>

            <div className="space-y-6">
              {/* Version Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Version Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={versionForm.version_number}
                    onChange={(e) => setVersionForm({ ...versionForm, version_number: e.target.value })}
                    placeholder="e.g., 1.0.0, 2.1.3"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Release Date
                  </label>
                  <input
                    type="date"
                    value={versionForm.release_date}
                    onChange={(e) => setVersionForm({ ...versionForm, release_date: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={versionForm.description}
                  onChange={(e) => setVersionForm({ ...versionForm, description: e.target.value })}
                  rows={3}
                  placeholder="What's new in this version..."
                  className="input-field"
                />
              </div>

              {/* Test Cases */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Test Cases</h4>
                  <button
                    onClick={addTestCase}
                    className="btn-secondary text-sm"
                  >
                    <i className="fas fa-plus mr-1"></i>
                    Add Test Case
                  </button>
                </div>

                {versionForm.test_cases.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No test cases added yet</p>
                ) : (
                  <div className="space-y-4">
                    {versionForm.test_cases.map((tc, tcIndex) => (
                      <div key={tcIndex} className="card p-4 bg-gray-50 dark:bg-gray-700/50">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Test Case #{tcIndex + 1}</span>
                          <button
                            onClick={() => removeTestCase(tcIndex)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>

                        <div className="space-y-3">
                          <input
                            type="text"
                            value={tc.title}
                            onChange={(e) => updateTestCase(tcIndex, 'title', e.target.value)}
                            placeholder="Test case title"
                            className="input-field text-sm"
                          />

                          <textarea
                            value={tc.instructions}
                            onChange={(e) => updateTestCase(tcIndex, 'instructions', e.target.value)}
                            placeholder="Instructions for this test case"
                            rows={2}
                            className="input-field text-sm"
                          />

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Steps</label>
                              <button
                                onClick={() => addStep(tcIndex)}
                                className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                              >
                                <i className="fas fa-plus mr-1"></i>Add Step
                              </button>
                            </div>
                            <div className="space-y-2">
                              {tc.steps.map((step, stepIndex) => (
                                <div key={stepIndex} className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500 w-6">{stepIndex + 1}.</span>
                                  <input
                                    type="text"
                                    value={step}
                                    onChange={(e) => updateStep(tcIndex, stepIndex, e.target.value)}
                                    placeholder="Step description"
                                    className="input-field flex-1 text-sm py-1"
                                  />
                                  <button
                                    onClick={() => removeStep(tcIndex, stepIndex)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <i className="fas fa-times text-xs"></i>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateVersion}
                  className="btn-primary flex-1"
                >
                  <i className="fas fa-save mr-2"></i>
                  Create Version
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
