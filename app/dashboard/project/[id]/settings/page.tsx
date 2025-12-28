// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

interface Project {
  id: string;
  name: string;
  description: string;
  api_key: string;
  webhook_url: string;
  webhook_secret: string;
  deploy_url: string;
}

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [webhookUrl, setWebhookUrl] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data.project);
        setWebhookUrl(data.project.webhook_url || '');
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_url: webhookUrl })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        fetchProject();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to save settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: `${label} copied to clipboard!` });
    setTimeout(() => setMessage({ type: '', text: '' }), 2000);
  };

  const testWebhook = async () => {
    if (!webhookUrl) {
      setMessage({ type: 'error', text: 'Please enter a webhook URL first' });
      return;
    }

    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`/api/projects/${projectId}/test-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_url: webhookUrl })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Test webhook sent successfully!' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Webhook test failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Webhook test failed' });
    }
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
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Project not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.push(`/dashboard/project/${projectId}`)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <i className="fas fa-arrow-left text-gray-500"></i>
            </button>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              <i className="fas fa-cog mr-2 text-indigo-500"></i>
              Project Settings
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 ml-11">{project.name}</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="card mb-6 p-1">
        <div className="flex gap-1">
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
            className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors"
          >
            <i className="fas fa-code-branch"></i>
            Versions
          </a>
          <a
            href={`/dashboard/project/${projectId}/settings`}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-medium text-sm"
          >
            <i className="fas fa-cog"></i>
            Settings
          </a>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
          <i className={`fas ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2`}></i>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* API Integration Section */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            <i className="fas fa-key mr-2 text-indigo-500"></i>
            API Integration
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Use these credentials to integrate external projects with PMS.
          </p>

          {/* API Key */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API Key
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={project.api_key || 'Not generated'}
                  readOnly
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white font-mono text-sm"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <i className={`fas ${showApiKey ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
              <button
                onClick={() => copyToClipboard(project.api_key, 'API Key')}
                className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition"
              >
                <i className="fas fa-copy"></i>
              </button>
            </div>
          </div>

          {/* Endpoint */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Register Version Endpoint
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value="https://pms.globaltechtrums.com/api/integrations/register-version"
                readOnly
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white font-mono text-sm"
              />
              <button
                onClick={() => copyToClipboard('https://pms.globaltechtrums.com/api/integrations/register-version', 'Endpoint')}
                className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition"
              >
                <i className="fas fa-copy"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Webhook Configuration Section */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            <i className="fas fa-bell mr-2 text-indigo-500"></i>
            Webhook Configuration
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Configure a webhook URL to receive notifications when testers request rebuilds or approve versions.
          </p>

          {/* Webhook URL */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Webhook URL
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-project.com/api/pms-webhook"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              PMS will send POST requests to this URL with test results and rebuild requests.
            </p>
          </div>

          {/* Webhook Events Info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Webhook Events:</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">rebuild_requested</code> - Tester requests a rebuild with detailed feedback</li>
              <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">version_approved</code> - Tester approves the version for release</li>
            </ul>
          </div>

          {/* Webhook Payload Example */}
          <details className="mb-4">
            <summary className="cursor-pointer text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
              View example webhook payload
            </summary>
            <pre className="mt-2 p-4 bg-gray-900 text-green-400 rounded-xl text-xs overflow-x-auto">
{`{
  "event": "rebuild_requested",
  "project_id": "uuid",
  "project_name": "Int-Video",
  "version_id": "uuid",
  "version_number": "2.0.6",
  "rebuild_notes": "Login button not working",
  "requested_by": "Tester Name",
  "requested_at": "2024-01-15T10:30:00Z",
  "test_summary": {
    "total": 3,
    "passing": 1,
    "failing": 2,
    "pending": 0
  },
  "failing_tests": [
    {
      "title": "Login Test",
      "status": "not_working",
      "tester_notes": "Button does not respond",
      "attachments": ["https://...screenshot.png"]
    }
  ],
  "pms_url": "https://pms.globaltechtrums.com/...",
  "feedback_api": "https://pms.globaltechtrums.com/..."
}`}
            </pre>
          </details>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={testWebhook}
              className="px-4 py-2 border border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
            >
              <i className="fas fa-paper-plane mr-2"></i>
              Test Webhook
            </button>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
