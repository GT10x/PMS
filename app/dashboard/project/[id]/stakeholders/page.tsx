'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Breadcrumb from '@/components/Breadcrumb';

interface Project {
  id: string;
  name: string;
  stakeholders: string[];
}

export default function StakeholdersPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stakeholders, setStakeholders] = useState<string[]>([]);
  const [newStakeholder, setNewStakeholder] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    fetchProject();
  }, []);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data.project);
        setStakeholders(data.project.stakeholders || []);
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

  const saveStakeholders = async (newList: string[]) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stakeholders: newList })
      });
      if (response.ok) {
        setStakeholders(newList);
      }
    } catch (error) {
      console.error('Error saving stakeholders:', error);
    } finally {
      setSaving(false);
    }
  };

  const addStakeholder = () => {
    if (newStakeholder.trim()) {
      const newList = [...stakeholders, newStakeholder.trim()];
      saveStakeholders(newList);
      setNewStakeholder('');
    }
  };

  const deleteStakeholder = (index: number) => {
    const newList = stakeholders.filter((_, i) => i !== index);
    saveStakeholders(newList);
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditingText(stakeholders[index]);
  };

  const saveEdit = () => {
    if (editingIndex !== null && editingText.trim()) {
      const newList = [...stakeholders];
      newList[editingIndex] = editingText.trim();
      saveStakeholders(newList);
    }
    setEditingIndex(null);
    setEditingText('');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingText('');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) return null;

  return (
    <DashboardLayout>
      <Breadcrumb items={[
        { label: 'Projects', href: '/dashboard/projects', icon: 'fas fa-folder' },
        { label: project.name, href: `/dashboard/project/${projectId}` },
        { label: 'Stakeholders' }
      ]} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">{project.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage project stakeholders</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="card mb-6 p-1 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          <a href={`/dashboard/project/${projectId}`} className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors">
            <i className="fas fa-home"></i>
            Overview
          </a>
          <a href={`/dashboard/project/${projectId}/reports`} className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors">
            <i className="fas fa-bug"></i>
            Reports
          </a>
          <a href={`/dashboard/project/${projectId}/versions`} className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors">
            <i className="fas fa-code-branch"></i>
            Versions
          </a>
          <a href={`/dashboard/project/${projectId}/modules`} className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors">
            <i className="fas fa-cubes"></i>
            Modules
          </a>
          <a href={`/dashboard/project/${projectId}/stakeholders`} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-medium text-sm">
            <i className="fas fa-users"></i>
            Stakeholders
          </a>
          <a href={`/dashboard/project/${projectId}/chat`} className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors">
            <i className="fas fa-comments"></i>
            Chat
          </a>
          <a href={`/dashboard/project/${projectId}/settings`} className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors">
            <i className="fas fa-cog"></i>
            Settings
          </a>
        </div>
      </div>

      {/* Stakeholders Card */}
      <div className="card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            <i className="fas fa-users mr-2 text-indigo-500"></i>
            Stakeholders ({stakeholders.length})
          </h2>
          {saving && (
            <span className="text-sm text-indigo-500">
              <i className="fas fa-spinner fa-spin mr-1"></i> Saving...
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Key stakeholders for this project (clients, managers, decision makers).
        </p>

        {/* Add Stakeholder Input */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newStakeholder}
            onChange={(e) => setNewStakeholder(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addStakeholder(); }}
            placeholder="Enter stakeholder name..."
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            onClick={addStakeholder}
            disabled={!newStakeholder.trim() || saving}
            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition font-medium"
          >
            <i className="fas fa-plus mr-2"></i>
            Add
          </button>
        </div>

        {/* Stakeholder List */}
        <div className="space-y-2">
          {stakeholders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <i className="fas fa-users text-4xl mb-3"></i>
              <p>No stakeholders added yet</p>
              <p className="text-sm">Add stakeholders to track key people involved in this project</p>
            </div>
          ) : (
            stakeholders.map((stakeholder, idx) => (
              <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-4 py-3 rounded-xl group">
                {editingIndex === idx ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      className="flex-1 px-3 py-2 border border-indigo-300 dark:border-indigo-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                    />
                    <button onClick={saveEdit} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg">
                      <i className="fas fa-check"></i>
                    </button>
                    <button onClick={cancelEdit} className="p-2 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg">
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
                        <i className="fas fa-user text-indigo-600 dark:text-indigo-400"></i>
                      </div>
                      <span className="text-gray-900 dark:text-white font-medium">{stakeholder}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditing(idx)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <i className="fas fa-pen text-sm"></i>
                      </button>
                      <button
                        onClick={() => deleteStakeholder(idx)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <i className="fas fa-trash text-sm"></i>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
