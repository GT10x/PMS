'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

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
    const styles = {
      testing: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      stable: 'bg-green-100 text-green-800 border-green-300',
      deprecated: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles]} uppercase`}>
        {status}
      </span>
    );
  };

  const getTestResultBadge = (status: string) => {
    const styles = {
      pass: 'bg-green-100 text-green-800 border-green-300',
      fail: 'bg-red-100 text-red-800 border-red-300',
      pending: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    const icons = {
      pass: '✅',
      fail: '❌',
      pending: '⏳'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold border ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]} {status.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading versions...</div>
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
                <i className="fas fa-code-branch mr-2 text-indigo-600"></i>
                Version Testing Tracker
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Track testing progress for each version release
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
        {/* Versions List */}
        <div className="space-y-4">
          {versions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <i className="fas fa-code-branch text-6xl text-gray-300 mb-4"></i>
              <p className="text-gray-600 text-lg">No versions found</p>
              <p className="text-gray-500 text-sm mt-2">Click the + button to create your first version</p>
            </div>
          ) : (
            versions.map((version) => (
              <div
                key={version.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Version Header */}
                <div
                  onClick={() => setExpandedVersion(expandedVersion === version.id ? null : version.id)}
                  className="p-6 cursor-pointer hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <i className={`fas fa-chevron-${expandedVersion === version.id ? 'down' : 'right'} text-gray-400`}></i>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          Version {version.version_number}
                        </h3>
                        {version.description && (
                          <p className="text-sm text-gray-600 mt-1">{version.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
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
                    {getStatusBadge(version.status)}
                  </div>
                </div>

                {/* Test Cases - Expandable */}
                {expandedVersion === version.id && version.test_cases && version.test_cases.length > 0 && (
                  <div className="border-t bg-gray-50">
                    <div className="p-6 space-y-3">
                      {version.test_cases.map((testCase) => (
                        <div
                          key={testCase.id}
                          className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                        >
                          {/* Test Case Header */}
                          <div
                            onClick={() => setExpandedTestCase(expandedTestCase === testCase.id ? null : testCase.id)}
                            className="p-4 cursor-pointer hover:bg-gray-50 transition"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <i className={`fas fa-chevron-${expandedTestCase === testCase.id ? 'down' : 'right'} text-gray-400 text-sm`}></i>
                                <span className="font-semibold text-gray-700">Test #{testCase.test_number}</span>
                                <span className="text-gray-900">{testCase.title}</span>
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
                            <div className="border-t bg-gray-50 p-4 space-y-4">
                              {/* Instructions */}
                              <div>
                                <h5 className="text-sm font-semibold text-gray-700 mb-2">Instructions</h5>
                                <p className="text-sm text-gray-900 bg-white p-3 rounded border">
                                  {testCase.instructions}
                                </p>
                              </div>

                              {/* Steps */}
                              {testCase.steps && testCase.steps.length > 0 && (
                                <div>
                                  <h5 className="text-sm font-semibold text-gray-700 mb-2">Steps</h5>
                                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-900 bg-white p-3 rounded border">
                                    {testCase.steps.map((step, index) => (
                                      <li key={index}>{step}</li>
                                    ))}
                                  </ol>
                                </div>
                              )}

                              {/* Test Results */}
                              {testCase.results && testCase.results.length > 0 && (
                                <div>
                                  <h5 className="text-sm font-semibold text-gray-700 mb-2">Test Results</h5>
                                  {testCase.results.map((result, index) => (
                                    <div key={index} className="bg-white p-3 rounded border mb-2">
                                      <div className="flex items-center justify-between mb-2">
                                        {getTestResultBadge(result.status)}
                                        {result.tested_by_user && (
                                          <span className="text-xs text-gray-500">
                                            by {result.tested_by_user.full_name}
                                          </span>
                                        )}
                                      </div>
                                      {result.notes && (
                                        <p className="text-sm text-gray-700">{result.notes}</p>
                                      )}
                                      {result.tested_at && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          {new Date(result.tested_at).toLocaleString()}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Mark Test Button - TODO: Implement */}
                              <button className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition">
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
                  <div className="border-t bg-gray-50 p-6 text-center">
                    <p className="text-gray-500">No test cases defined for this version</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-8 right-8 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 z-50"
        title="Create New Version"
      >
        <i className="fas fa-plus text-xl"></i>
      </button>

      {/* Create Version Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                <i className="fas fa-code-branch mr-2 text-indigo-500"></i>
                Create New Version
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <div className="space-y-6">
              {/* Version Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Version Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={versionForm.version_number}
                    onChange={(e) => setVersionForm({ ...versionForm, version_number: e.target.value })}
                    placeholder="e.g., 1.0.0, 2.1.3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Release Date
                  </label>
                  <input
                    type="date"
                    value={versionForm.release_date}
                    onChange={(e) => setVersionForm({ ...versionForm, release_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={versionForm.description}
                  onChange={(e) => setVersionForm({ ...versionForm, description: e.target.value })}
                  rows={3}
                  placeholder="What's new in this version..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Test Cases */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-gray-900">Test Cases</h4>
                  <button
                    onClick={addTestCase}
                    className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition text-sm"
                  >
                    <i className="fas fa-plus mr-1"></i>
                    Add Test Case
                  </button>
                </div>

                {versionForm.test_cases.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No test cases added yet</p>
                ) : (
                  <div className="space-y-4">
                    {versionForm.test_cases.map((tc, tcIndex) => (
                      <div key={tcIndex} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-gray-700">Test Case #{tcIndex + 1}</span>
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                          />

                          <textarea
                            value={tc.instructions}
                            onChange={(e) => updateTestCase(tcIndex, 'instructions', e.target.value)}
                            placeholder="Instructions for this test case"
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                          />

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-semibold text-gray-700">Steps</label>
                              <button
                                onClick={() => addStep(tcIndex)}
                                className="text-xs text-indigo-600 hover:text-indigo-800"
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
                                    className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
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
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateVersion}
                  className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition flex items-center gap-2"
                >
                  <i className="fas fa-save"></i>
                  Create Version
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
