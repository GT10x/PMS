'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Breadcrumb from '@/components/Breadcrumb';

interface Module {
  id: string;
  name: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'planned' | 'in_progress' | 'completed' | 'on_hold';
  eta: string | null;
  stakeholders: string[];
  created_at: string;
  updated_at: string;
  created_by_user?: { id: string; full_name: string };
}

interface User {
  id: string;
  full_name: string;
  role: string;
  is_admin?: boolean;
}

interface Project {
  id: string;
  name: string;
}

export default function ProjectModulesPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Inline editing states
  const [editingFeature, setEditingFeature] = useState<{ moduleId: string; index: number } | null>(null);
  const [editingFeatureText, setEditingFeatureText] = useState('');
  const [addingFeature, setAddingFeature] = useState<string | null>(null);
  const [newFeatureText, setNewFeatureText] = useState('');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 'medium',
    status: 'planned',
    eta: '',
    stakeholders: ''
  });

  // Features as array for numbered inputs
  const [featuresList, setFeaturesList] = useState<string[]>(['']);

  // Speech-to-text state
  const [listeningIndex, setListeningIndex] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef<boolean>(false);
  const currentIndexRef = useRef<number | null>(null);

  const startListening = (index: number) => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      shouldRestartRef.current = false;
      recognitionRef.current.stop();
    }

    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = false;
    recog.lang = 'en-US';

    currentIndexRef.current = index;
    shouldRestartRef.current = true;
    setListeningIndex(index);

    recog.onresult = (event: any) => {
      // Get only the latest result
      const lastResultIndex = event.results.length - 1;
      const transcript = event.results[lastResultIndex][0].transcript;

      setFeaturesList(prev => {
        const updated = [...prev];
        const idx = currentIndexRef.current;
        if (idx !== null) {
          updated[idx] = updated[idx] ? updated[idx] + ' ' + transcript : transcript;
        }
        return updated;
      });
    };

    recog.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone access and try again.');
        shouldRestartRef.current = false;
        setListeningIndex(null);
      }
      // Don't stop on no-speech error, just continue
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        shouldRestartRef.current = false;
        setListeningIndex(null);
      }
    };

    recog.onend = () => {
      // Auto-restart if we should still be listening
      if (shouldRestartRef.current && currentIndexRef.current !== null) {
        try {
          recog.start();
        } catch (e) {
          // Ignore errors on restart
        }
      } else {
        setListeningIndex(null);
      }
    };

    recognitionRef.current = recog;

    try {
      recog.start();
    } catch (e) {
      console.error('Error starting recognition:', e);
      setListeningIndex(null);
    }
  };

  const stopListening = () => {
    shouldRestartRef.current = false;
    currentIndexRef.current = null;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListeningIndex(null);
  };

  useEffect(() => {
    fetchProject();
    fetchModules();
    fetchCurrentUser();
  }, []);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/view`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  const fetchModules = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/modules`);
      if (response.ok) {
        const data = await response.json();
        setModules(data.modules || []);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  // Inline feature editing
  const startEditFeature = (moduleId: string, index: number, text: string) => {
    setEditingFeature({ moduleId, index });
    setEditingFeatureText(text);
  };

  const saveEditFeature = async (moduleId: string) => {
    if (!editingFeature) return;
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    const lines = module.description ? module.description.split('\n').filter(line => line.trim()) : [];
    lines[editingFeature.index] = editingFeatureText.trim();

    try {
      const response = await fetch(`/api/projects/${projectId}/modules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: moduleId,
          description: lines.join('\n')
        })
      });
      if (response.ok) {
        const data = await response.json();
        setModules(prev => prev.map(m => m.id === moduleId ? data.module : m));
      }
    } catch (error) {
      console.error('Error updating feature:', error);
    }
    setEditingFeature(null);
    setEditingFeatureText('');
  };

  const deleteFeature = async (moduleId: string, index: number) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    const lines = module.description ? module.description.split('\n').filter(line => line.trim()) : [];
    lines.splice(index, 1);

    try {
      const response = await fetch(`/api/projects/${projectId}/modules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: moduleId,
          description: lines.join('\n')
        })
      });
      if (response.ok) {
        const data = await response.json();
        setModules(prev => prev.map(m => m.id === moduleId ? data.module : m));
      }
    } catch (error) {
      console.error('Error deleting feature:', error);
    }
  };

  const addFeature = async (moduleId: string) => {
    if (!newFeatureText.trim()) return;
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    const lines = module.description ? module.description.split('\n').filter(line => line.trim()) : [];
    lines.push(newFeatureText.trim());

    try {
      const response = await fetch(`/api/projects/${projectId}/modules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: moduleId,
          description: lines.join('\n')
        })
      });
      if (response.ok) {
        const data = await response.json();
        setModules(prev => prev.map(m => m.id === moduleId ? data.module : m));
      }
    } catch (error) {
      console.error('Error adding feature:', error);
    }
    setAddingFeature(null);
    setNewFeatureText('');
  };

  const canManageModules = () => {
    if (!currentUser) return false;
    return currentUser.is_admin ||
           currentUser.role === 'project_manager' ||
           currentUser.role === 'cto';
  };

  const toggleExpanded = (moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      priority: 'medium',
      status: 'planned',
      eta: '',
      stakeholders: ''
    });
    setFeaturesList(['']);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (module: Module) => {
    setSelectedModule(module);
    const features = module.description
      ? module.description.split('\n').filter(line => line.trim()).map(line => line.replace(/^[•\-\*\d\.]+\s*/, ''))
      : [''];
    setFormData({
      name: module.name,
      description: module.description || '',
      priority: module.priority,
      status: module.status,
      eta: module.eta || '',
      stakeholders: module.stakeholders?.join(', ') || ''
    });
    setFeaturesList(features.length > 0 ? features : ['']);
    setShowEditModal(true);
  };

  const handleAddModule = async () => {
    if (!formData.name.trim()) {
      alert('Module name is required');
      return;
    }

    setSaving(true);
    try {
      // Convert featuresList to newline-separated description
      const description = featuresList.filter(f => f.trim()).join('\n');

      const response = await fetch(`/api/projects/${projectId}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: description,
          priority: formData.priority,
          status: formData.status,
          eta: formData.eta || null,
          stakeholders: formData.stakeholders
            ? formData.stakeholders.split(',').map(s => s.trim()).filter(Boolean)
            : []
        })
      });

      if (response.ok) {
        const data = await response.json();
        setModules(prev => [...prev, data.module]);
        setShowAddModal(false);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create module');
      }
    } catch (error) {
      console.error('Error creating module:', error);
      alert('Failed to create module');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateModule = async () => {
    if (!selectedModule || !formData.name.trim()) {
      alert('Module name is required');
      return;
    }

    setSaving(true);
    try {
      // Convert featuresList to newline-separated description
      const description = featuresList.filter(f => f.trim()).join('\n');

      const response = await fetch(`/api/projects/${projectId}/modules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: selectedModule.id,
          name: formData.name,
          description: description,
          priority: formData.priority,
          status: formData.status,
          eta: formData.eta || null,
          stakeholders: formData.stakeholders
            ? formData.stakeholders.split(',').map(s => s.trim()).filter(Boolean)
            : []
        })
      });

      if (response.ok) {
        const data = await response.json();
        setModules(prev => prev.map(m => m.id === selectedModule.id ? data.module : m));
        setShowEditModal(false);
        setSelectedModule(null);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update module');
      }
    } catch (error) {
      console.error('Error updating module:', error);
      alert('Failed to update module');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Are you sure you want to delete this module?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/modules?module_id=${moduleId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setModules(prev => prev.filter(m => m.id !== moduleId));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete module');
      }
    } catch (error) {
      console.error('Error deleting module:', error);
      alert('Failed to delete module');
    }
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      low: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Low' },
      medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', label: 'Medium' },
      high: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', label: 'High' },
      critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Critical' }
    };
    const badge = badges[priority] || badges.medium;
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      planned: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Planned' },
      in_progress: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', label: 'In Progress' },
      completed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Completed' },
      on_hold: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-400', label: 'On Hold' }
    };
    const badge = badges[status] || badges.planned;
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Breadcrumb items={[
          { label: 'Projects', href: '/dashboard/projects' },
          { label: 'Loading...' }
        ]} />
        <div className="flex items-center justify-center py-12">
          <i className="fas fa-spinner animate-spin text-indigo-500 text-3xl"></i>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Breadcrumb items={[
        { label: 'Projects', href: '/dashboard/projects' },
        { label: project?.name || 'Project', href: `/dashboard/project/${projectId}` },
        { label: 'Modules' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Project Modules
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Plan and track modules/features for this project
          </p>
        </div>
        {canManageModules() && (
          <button
            onClick={openAddModal}
            className="btn-primary flex items-center gap-2"
          >
            <i className="fas fa-plus"></i>
            Add Module
          </button>
        )}
      </div>

      {/* Project Navigation Tabs */}
      <div className="flex gap-2 mb-6 border-b dark:border-gray-700 pb-4 overflow-x-auto">
        <button
          onClick={() => router.push(`/dashboard/project/${projectId}`)}
          className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 whitespace-nowrap"
        >
          Overview
        </button>
        <button
          onClick={() => router.push(`/dashboard/project/${projectId}/reports`)}
          className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 whitespace-nowrap"
        >
          Reports
        </button>
        <button
          onClick={() => router.push(`/dashboard/project/${projectId}/versions`)}
          className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 whitespace-nowrap"
        >
          Versions
        </button>
        <button
          className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 whitespace-nowrap"
        >
          Modules
        </button>
        <button
          onClick={() => router.push(`/dashboard/project/${projectId}/chat`)}
          className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 whitespace-nowrap"
        >
          Chat
        </button>
        <button
          onClick={() => router.push(`/dashboard/project/${projectId}/settings`)}
          className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 whitespace-nowrap"
        >
          Settings
        </button>
      </div>

      {/* Modules List */}
      <div className="space-y-3">
        {modules.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <i className="fas fa-cubes text-4xl text-gray-300 dark:text-gray-600 mb-3"></i>
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">No modules yet</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Start by adding modules to plan your project features
            </p>
            {canManageModules() && (
              <button onClick={openAddModal} className="btn-primary">
                <i className="fas fa-plus mr-2"></i>Add First Module
              </button>
            )}
          </div>
        ) : (
          modules.map((module) => {
            const isExpanded = expandedModules.has(module.id);
            const descriptionLines = module.description
              ? module.description.split('\n').filter(line => line.trim())
              : [];

            return (
              <div
                key={module.id}
                className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm"
              >
                {/* Collapsed Header */}
                <button
                  onClick={() => toggleExpanded(module.id)}
                  className={`w-full px-4 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left ${
                    isExpanded ? 'bg-gray-50 dark:bg-gray-700/50' : ''
                  }`}
                >
                  {/* Expand/Collapse Icon */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                    <i className={`fas ${isExpanded ? 'fa-minus' : 'fa-plus'} text-sm`}></i>
                  </div>

                  {/* Module Name */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {module.name}
                      {module.created_by_user && (
                        <span className="ml-2 text-sm font-normal text-gray-400 dark:text-gray-500">
                          by {module.created_by_user.full_name}
                        </span>
                      )}
                    </h3>
                    {!isExpanded && descriptionLines.length > 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {descriptionLines[0].replace(/^[•\-\*]\s*/, '')}
                        {descriptionLines.length > 1 && ` (+${descriptionLines.length - 1} more)`}
                      </p>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {module.stakeholders && module.stakeholders.length > 0 && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                        <i className="fas fa-users mr-1"></i>
                        {module.stakeholders.length}
                      </span>
                    )}
                    {getStatusBadge(module.status)}
                    {getPriorityBadge(module.priority)}
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
                      {module.eta && (
                        <div className="flex items-center gap-1">
                          <i className="fas fa-calendar text-indigo-500"></i>
                          <span>ETA: {formatDate(module.eta)}</span>
                        </div>
                      )}
                      {module.stakeholders && module.stakeholders.length > 0 && (
                        <div className="flex items-center gap-1">
                          <i className="fas fa-users text-purple-500"></i>
                          <span>Stakeholders: {module.stakeholders.join(', ')}</span>
                        </div>
                      )}

                    </div>

                    {/* Features List with Inline Editing */}
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Features / Functions:
                      </h4>
                      <ol className="space-y-2">
                        {descriptionLines.map((line, idx) => {
                          const isEditing = editingFeature?.moduleId === module.id && editingFeature?.index === idx;
                          const cleanLine = line.replace(/^[•\-\*\d\.]+\s*/, '');

                          return (
                            <li key={idx} className="flex items-start gap-2 group">
                              <span className="text-indigo-600 dark:text-indigo-400 font-medium min-w-[24px] mt-1 text-sm">{idx + 1}.</span>
                              {isEditing ? (
                                <div className="flex-1 flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editingFeatureText}
                                    onChange={(e) => setEditingFeatureText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveEditFeature(module.id);
                                      if (e.key === 'Escape') { setEditingFeature(null); setEditingFeatureText(''); }
                                    }}
                                    className="flex-1 px-2 py-1 text-sm border border-indigo-300 dark:border-indigo-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => saveEditFeature(module.id)}
                                    className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                  >
                                    <i className="fas fa-check"></i>
                                  </button>
                                  <button
                                    onClick={() => { setEditingFeature(null); setEditingFeatureText(''); }}
                                    className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                  >
                                    <i className="fas fa-times"></i>
                                  </button>
                                </div>
                              ) : (
                                <div className="flex-1 flex items-center justify-between">
                                  <span className="text-sm text-gray-600 dark:text-gray-400">{cleanLine}</span>
                                  {canManageModules() && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); startEditFeature(module.id, idx, cleanLine); }}
                                        className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded"
                                        title="Edit"
                                      >
                                        <i className="fas fa-pen text-xs"></i>
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); deleteFeature(module.id, idx); }}
                                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                        title="Delete"
                                      >
                                        <i className="fas fa-trash text-xs"></i>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ol>

                      {/* Add Feature */}
                      {canManageModules() && (
                        <div className="mt-3">
                          {addingFeature === module.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-indigo-600 dark:text-indigo-400 font-medium min-w-[24px] text-sm">{descriptionLines.length + 1}.</span>
                              <input
                                type="text"
                                value={newFeatureText}
                                onChange={(e) => setNewFeatureText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') addFeature(module.id);
                                  if (e.key === 'Escape') { setAddingFeature(null); setNewFeatureText(''); }
                                }}
                                placeholder="Type feature and press Enter..."
                                className="flex-1 px-2 py-1 text-sm border border-indigo-300 dark:border-indigo-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                autoFocus
                              />
                              <button
                                onClick={() => addFeature(module.id)}
                                className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                              >
                                <i className="fas fa-check"></i>
                              </button>
                              <button
                                onClick={() => { setAddingFeature(null); setNewFeatureText(''); }}
                                className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setAddingFeature(module.id); }}
                              className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                            >
                              <i className="fas fa-plus text-xs"></i>
                              <span>Add Feature</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {canManageModules() && (
                      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(module); }}
                          className="px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                        >
                          <i className="fas fa-cog mr-1"></i> Edit Details
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteModule(module.id); }}
                          className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <i className="fas fa-trash mr-1"></i> Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Module Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Module</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Module Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="e.g., User Authentication"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Features / Functions
                </label>
                <div className="space-y-2">
                  {featuresList.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium min-w-[24px] text-sm">{idx + 1}.</span>
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => {
                          const updated = [...featuresList];
                          updated[idx] = e.target.value;
                          setFeaturesList(updated);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setFeaturesList([...featuresList, '']);
                            // Focus on new input after React re-renders
                            setTimeout(() => {
                              const inputs = document.querySelectorAll('input[placeholder*="feature"], input[placeholder*="Feature"]');
                              const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
                              if (lastInput) lastInput.focus();
                            }, 50);
                          }
                        }}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={idx === 0 ? "e.g., Login with email/password" : "Add another feature..."}
                      />
                      <button
                        type="button"
                        onClick={() => listeningIndex === idx ? stopListening() : startListening(idx)}
                        className={`p-2 rounded transition-colors ${
                          listeningIndex === idx
                            ? 'text-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse'
                            : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                        }`}
                        title={listeningIndex === idx ? 'Stop listening' : 'Voice input'}
                      >
                        <i className={`fas fa-microphone ${listeningIndex === idx ? 'text-red-500' : ''}`}></i>
                      </button>
                      {featuresList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setFeaturesList(featuresList.filter((_, i) => i !== idx))}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        >
                          <i className="fas fa-times text-xs"></i>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setFeaturesList([...featuresList, ''])}
                  className="mt-2 flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
                >
                  <i className="fas fa-plus text-xs"></i>
                  <span>Add Feature</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input-field"
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ETA (Target Date)
                </label>
                <input
                  type="date"
                  value={formData.eta}
                  onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stakeholders
                </label>
                <input
                  type="text"
                  value={formData.stakeholders}
                  onChange={(e) => setFormData({ ...formData, stakeholders: e.target.value })}
                  className="input-field"
                  placeholder="e.g., John, Sarah, Marketing Team"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Separate multiple stakeholders with commas
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-secondary flex-1"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleAddModule}
                disabled={saving || !formData.name.trim()}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-spinner animate-spin"></i> Creating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-plus"></i> Add Module
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Module Modal */}
      {showEditModal && selectedModule && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Module</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Module Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Features / Functions
                </label>
                <div className="space-y-2">
                  {featuresList.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium min-w-[24px] text-sm">{idx + 1}.</span>
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => {
                          const updated = [...featuresList];
                          updated[idx] = e.target.value;
                          setFeaturesList(updated);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setFeaturesList([...featuresList, '']);
                            // Focus on new input after React re-renders
                            setTimeout(() => {
                              const inputs = document.querySelectorAll('input[placeholder*="feature"], input[placeholder*="Feature"]');
                              const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
                              if (lastInput) lastInput.focus();
                            }, 50);
                          }
                        }}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Feature description..."
                      />
                      {featuresList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setFeaturesList(featuresList.filter((_, i) => i !== idx))}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        >
                          <i className="fas fa-times text-xs"></i>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setFeaturesList([...featuresList, ''])}
                  className="mt-2 flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
                >
                  <i className="fas fa-plus text-xs"></i>
                  <span>Add Feature</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input-field"
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ETA (Target Date)
                </label>
                <input
                  type="date"
                  value={formData.eta}
                  onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stakeholders
                </label>
                <input
                  type="text"
                  value={formData.stakeholders}
                  onChange={(e) => setFormData({ ...formData, stakeholders: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="btn-secondary flex-1"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateModule}
                disabled={saving || !formData.name.trim()}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-spinner animate-spin"></i> Saving...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-save"></i> Save Changes
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
