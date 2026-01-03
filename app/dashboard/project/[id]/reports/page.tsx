'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

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
  edited_at?: string;
  deleted_at?: string;
  is_deleted?: boolean;
  reported_by: string;
  reported_by_user: { id: string; full_name: string };
  assigned_to_user?: { full_name: string };
  version?: { version_number: string };
}

interface User {
  id: string;
  full_name: string;
  role: string;
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

  // Create form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'bug',
    priority: 'medium',
    browser: '',
    device: ''
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [voiceNote, setVoiceNote] = useState<Blob | null>(null);
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // View/Edit modal state
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [editData, setEditData] = useState({
    status: '',
    assigned_to: '',
    dev_notes: ''
  });

  useEffect(() => {
    fetchReports();
    fetchUsers();
    fetchCurrentUser();
    markReportsAsRead();
  }, [statusFilter, typeFilter]);

  const markReportsAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, type: 'reports' })
      });
    } catch (error) {
      // Silent fail
    }
  };

  useEffect(() => {
    // Detect browser and device info
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    let device = 'Desktop';

    // Detect browser
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    // Detect device
    if (/Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)) {
      device = 'Mobile';
    } else if (/Tablet|iPad/i.test(userAgent)) {
      device = 'Tablet';
    }

    setFormData(prev => ({ ...prev, browser, device }));
  }, []);

  // Cleanup voice note URL when component unmounts or modal closes
  useEffect(() => {
    return () => {
      if (voiceNoteUrl) {
        URL.revokeObjectURL(voiceNoteUrl);
      }
    };
  }, [voiceNoteUrl]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
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

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  // Voice Recording Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setVoiceNote(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setVoiceNoteUrl(url);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please ensure microphone permissions are granted.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const deleteVoiceNote = () => {
    if (voiceNoteUrl) {
      URL.revokeObjectURL(voiceNoteUrl);
    }
    setVoiceNote(null);
    setVoiceNoteUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const togglePlayback = () => {
    if (!voiceNoteUrl) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(voiceNoteUrl);
        audioRef.current.onended = () => setIsPlaying(false);
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCreateReport = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please fill in title and description');
      return;
    }

    setUploading(true);
    try {
      // Upload attachments
      const uploadedUrls: string[] = [];

      // Upload regular files
      for (const file of attachments) {
        const formDataToSend = new FormData();
        formDataToSend.append('file', file);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formDataToSend
        });

        if (uploadResponse.ok) {
          const { url } = await uploadResponse.json();
          uploadedUrls.push(url);
        }
      }

      // Upload voice note if exists
      if (voiceNote) {
        const voiceFormData = new FormData();
        const voiceFile = new File([voiceNote], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
        voiceFormData.append('file', voiceFile);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: voiceFormData
        });

        if (uploadResponse.ok) {
          const { url } = await uploadResponse.json();
          uploadedUrls.push(url);
        }
      }

      // Create report
      const response = await fetch(`/api/projects/${projectId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          attachments: uploadedUrls
        })
      });

      if (response.ok) {
        alert('Report created successfully!');
        setShowCreateModal(false);
        setFormData({
          title: '',
          description: '',
          type: 'bug',
          priority: 'medium',
          browser: formData.browser,
          device: formData.device
        });
        setAttachments([]);
        deleteVoiceNote();
        fetchReports();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating report:', error);
      alert('Failed to create report');
    } finally {
      setUploading(false);
    }
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setEditData({
      status: report.status,
      assigned_to: report.assigned_to_user?.full_name || '',
      dev_notes: report.dev_notes || ''
    });
  };

  const handleUpdateReport = async () => {
    if (!selectedReport) return;

    setUploading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/reports/${selectedReport.id}`, {
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
      setUploading(false);
    }
  };

  const canManageReport = () => {
    if (!currentUser) return false;
    return currentUser.role === 'admin' || currentUser.role === 'project_manager';
  };

  // State for edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    type: 'bug',
    priority: 'medium'
  });
  const [editAttachments, setEditAttachments] = useState<string[]>([]);
  const [newEditFiles, setNewEditFiles] = useState<File[]>([]);

  // Edit modal voice recording state
  const [editIsRecording, setEditIsRecording] = useState(false);
  const [editRecordingTime, setEditRecordingTime] = useState(0);
  const [editVoiceNote, setEditVoiceNote] = useState<Blob | null>(null);
  const [editVoiceNoteUrl, setEditVoiceNoteUrl] = useState<string | null>(null);
  const [editIsPlaying, setEditIsPlaying] = useState(false);
  const editMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const editAudioChunksRef = useRef<Blob[]>([]);
  const editTimerRef = useRef<NodeJS.Timeout | null>(null);
  const editAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleEditReport = (report: Report) => {
    setEditingReport(report);
    setEditFormData({
      title: report.title,
      description: report.description,
      type: report.type,
      priority: report.priority
    });
    setEditAttachments(report.attachments || []);
    setNewEditFiles([]);
    // Reset voice note state
    setEditVoiceNote(null);
    setEditVoiceNoteUrl(null);
    setEditRecordingTime(0);
    setEditIsPlaying(false);
    setShowEditModal(true);
  };

  const handleRemoveEditAttachment = (index: number) => {
    setEditAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setNewEditFiles(prev => [...prev, ...files]);
    }
  };

  const removeNewEditFile = (index: number) => {
    setNewEditFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Edit modal voice recording functions
  const startEditRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      editMediaRecorderRef.current = mediaRecorder;
      editAudioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          editAudioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(editAudioChunksRef.current, { type: 'audio/webm' });
        setEditVoiceNote(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setEditVoiceNoteUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setEditIsRecording(true);
      setEditRecordingTime(0);

      editTimerRef.current = setInterval(() => {
        setEditRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please ensure microphone permissions are granted.');
    }
  };

  const stopEditRecording = () => {
    if (editMediaRecorderRef.current && editIsRecording) {
      editMediaRecorderRef.current.stop();
      setEditIsRecording(false);
      if (editTimerRef.current) {
        clearInterval(editTimerRef.current);
        editTimerRef.current = null;
      }
    }
  };

  const deleteEditVoiceNote = () => {
    if (editVoiceNoteUrl) {
      URL.revokeObjectURL(editVoiceNoteUrl);
    }
    setEditVoiceNote(null);
    setEditVoiceNoteUrl(null);
    setEditRecordingTime(0);
    setEditIsPlaying(false);
    if (editAudioRef.current) {
      editAudioRef.current.pause();
      editAudioRef.current = null;
    }
  };

  const toggleEditPlayback = () => {
    if (!editVoiceNoteUrl) return;

    if (editIsPlaying && editAudioRef.current) {
      editAudioRef.current.pause();
      setEditIsPlaying(false);
    } else {
      if (!editAudioRef.current) {
        editAudioRef.current = new Audio(editVoiceNoteUrl);
        editAudioRef.current.onended = () => setEditIsPlaying(false);
      }
      editAudioRef.current.play();
      setEditIsPlaying(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingReport) return;

    setUploading(true);
    try {
      // Upload new files
      const uploadedUrls: string[] = [];
      for (const file of newEditFiles) {
        const formDataToSend = new FormData();
        formDataToSend.append('file', file);
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formDataToSend
        });
        if (uploadResponse.ok) {
          const { url } = await uploadResponse.json();
          uploadedUrls.push(url);
        }
      }

      // Upload new voice note if exists
      if (editVoiceNote) {
        const voiceFormData = new FormData();
        const voiceFile = new File([editVoiceNote], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
        voiceFormData.append('file', voiceFile);
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: voiceFormData
        });
        if (uploadResponse.ok) {
          const { url } = await uploadResponse.json();
          uploadedUrls.push(url);
        }
      }

      // Combine existing and new attachments
      const allAttachments = [...editAttachments, ...uploadedUrls];

      const response = await fetch(`/api/reports/${editingReport.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editFormData,
          attachments: allAttachments
        })
      });

      if (response.ok) {
        alert('Report updated successfully!');
        setShowEditModal(false);
        setEditingReport(null);
        fetchReports();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Failed to update report');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report? It will be marked as deleted but still visible.')) {
      return;
    }

    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('Report deleted successfully!');
        fetchReports();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report');
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

  // Reset form when modal closes
  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    deleteVoiceNote();
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
              <i className="fas fa-bug mr-2 text-orange-500"></i>
              Reports & Issues
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 ml-11">Track bugs, features, and improvements</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <i className="fas fa-plus"></i>
          New Report
        </button>
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
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-medium text-sm"
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
            href={`/dashboard/project/${projectId}/chat`}
            className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors"
          >
            <i className="fas fa-comments"></i>
            Chat
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <i className="fas fa-filter text-gray-500"></i>
            <span className="font-medium text-gray-700 dark:text-gray-300">Filters:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-auto"
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
            className="input-field w-auto"
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
            className="btn-secondary"
          >
            <i className="fas fa-redo mr-1"></i> Reset
          </button>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="card p-12 text-center">
            <i className="fas fa-inbox text-6xl text-gray-300 dark:text-gray-600 mb-4"></i>
            <p className="text-gray-600 dark:text-gray-400 text-lg">No reports found</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">Click "New Report" to create your first report</p>
          </div>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
              onClick={() => handleViewReport(report)}
              className={`card p-6 hover:shadow-lg transition cursor-pointer ${report.is_deleted ? 'opacity-60 bg-red-50 dark:bg-red-900/10' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="text-2xl">{getTypeEmoji(report.type)}</span>
                    <h3 className={`text-xl font-bold ${report.is_deleted ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>{report.title}</h3>
                    {getStatusBadge(report.status)}
                    {report.priority !== 'medium' && getPriorityBadge(report.priority)}
                    {report.is_deleted && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs font-medium rounded-full">
                        Deleted
                      </span>
                    )}
                    {report.edited_at && !report.is_deleted && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs font-medium rounded-full">
                        Edited
                      </span>
                    )}
                  </div>

                  <p className="text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">{report.description}</p>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
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
                    {report.attachments.length > 0 && (() => {
                      const hasVoiceNote = report.attachments.some((url: string) => {
                        const lower = url.toLowerCase();
                        return lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.ogg') || lower.endsWith('.m4a') || lower.includes('audio') || lower.includes('voice');
                      });
                      const hasVideo = report.attachments.some((url: string) => {
                        const lower = url.toLowerCase();
                        return lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.avi') || lower.endsWith('.mkv') || (lower.endsWith('.webm') && !lower.includes('audio') && !lower.includes('voice'));
                      });
                      const specialFiles = (hasVoiceNote ? 1 : 0) + (hasVideo ? 1 : 0);
                      const otherFiles = report.attachments.length - specialFiles;
                      return (
                        <>
                          {hasVoiceNote && (
                            <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                              <i className="fas fa-play-circle"></i> Voice Note
                            </span>
                          )}
                          {hasVideo && (
                            <span className="text-purple-600 dark:text-purple-400 font-medium">
                              <i className="fas fa-video"></i> Video
                            </span>
                          )}
                          {otherFiles > 0 && (
                            <span><i className="fas fa-paperclip"></i> {otherFiles} file(s)</span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                                    {/* Edit/Delete buttons - only for creator */}
                  {currentUser && currentUser.id && report.reported_by && report.reported_by === currentUser.id && !report.is_deleted && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditReport(report);
                        }}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition"
                        title="Edit Report"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteReport(report.id);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                        title="Delete Report"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </>
                  )}
                  <button className="btn-primary">
                    <i className="fas fa-eye mr-1"></i>
                    View
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Report Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={handleCloseCreateModal}>
          <div className="modal-content max-w-3xl animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                  <i className="fas fa-plus-circle mr-2 text-orange-500"></i>
                  Create New Report
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Report a bug or request a feature</p>
              </div>
              <button
                onClick={handleCloseCreateModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <i className="fas fa-times text-gray-500"></i>
              </button>
            </div>

            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input-field"
                  placeholder="Brief summary of the issue or feature"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={5}
                  className="input-field"
                  placeholder="Detailed description, steps to reproduce, expected vs actual behavior..."
                />
              </div>

              {/* Voice Note Recording */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <i className="fas fa-microphone mr-1"></i>
                  Voice Note (Optional)
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Record a voice message instead of typing a long description
                </p>

                {!voiceNote ? (
                  // Recording Controls
                  <div className="flex items-center gap-4">
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="flex items-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
                      >
                        <i className="fas fa-microphone"></i>
                        Start Recording
                      </button>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 px-4 py-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            Recording... {formatTime(recordingTime)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="flex items-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-colors"
                        >
                          <i className="fas fa-stop"></i>
                          Stop
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  // Playback Controls
                  <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
                    <button
                      type="button"
                      onClick={togglePlayback}
                      className="w-12 h-12 flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 text-white rounded-full transition-colors"
                    >
                      <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                    </button>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-white">
                        Voice Note Recorded
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Duration: {formatTime(recordingTime)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={deleteVoiceNote}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete voice note"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                )}
              </div>

              {/* Type and Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input-field"
                  >
                    <option value="bug">Bug</option>
                    <option value="feature">Feature Request</option>
                    <option value="improvement">Improvement</option>
                    <option value="task">Task</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
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

              {/* Browser and Device */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Browser (auto-detected)
                  </label>
                  <input
                    type="text"
                    value={formData.browser}
                    onChange={(e) => setFormData({ ...formData, browser: e.target.value })}
                    className="input-field bg-gray-50 dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Device (auto-detected)
                  </label>
                  <input
                    type="text"
                    value={formData.device}
                    onChange={(e) => setFormData({ ...formData, device: e.target.value })}
                    className="input-field bg-gray-50 dark:bg-gray-700"
                  />
                </div>
              </div>

              {/* File Attachments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Attachments (Screenshots, Videos, Audio)
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2"></i>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Click to upload files or drag and drop
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      Images, Videos, Audio, PDF (max 50MB each)
                    </span>
                  </label>

                  {attachments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {attachments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded border dark:border-gray-600"
                        >
                          <div className="flex items-center gap-2">
                            <i className="fas fa-file text-gray-600 dark:text-gray-400"></i>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                            <span className="text-xs text-gray-500">
                              ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCloseCreateModal}
                  className="btn-secondary flex-1"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateReport}
                  disabled={uploading}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fas fa-spinner animate-spin"></i>
                      Creating...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fas fa-paper-plane"></i>
                      Create Report
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View/Manage Report Modal */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal-content max-w-4xl animate-fadeIn" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{getTypeEmoji(selectedReport.type)}</span>
                  <h3 className={`text-2xl font-bold ${selectedReport.is_deleted ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>{selectedReport.title}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedReport.is_deleted && (
                    <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-sm font-medium rounded-full">
                      <i className="fas fa-trash mr-1"></i> Deleted
                    </span>
                  )}
                  {selectedReport.edited_at && !selectedReport.is_deleted && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-sm font-medium rounded-full">
                      <i className="fas fa-edit mr-1"></i> Edited
                    </span>
                  )}
                  {!selectedReport.is_deleted && getStatusBadge(selectedReport.status)}
                  {!selectedReport.is_deleted && getPriorityBadge(selectedReport.priority)}
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <i className="fas fa-times text-gray-500"></i>
              </button>
            </div>

            {/* Deleted Report Message */}
            {selectedReport.is_deleted ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-trash-alt text-red-500 text-3xl"></i>
                </div>
                <h4 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">This report has been deleted</h4>
                <p className="text-gray-500 dark:text-gray-400 mb-2">
                  Deleted by {selectedReport.reported_by_user.full_name}
                </p>
                {selectedReport.deleted_at && (
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    on {new Date(selectedReport.deleted_at).toLocaleString()}
                  </p>
                )}
                <button
                  onClick={() => setSelectedReport(null)}
                  className="btn-secondary mt-6"
                >
                  Close
                </button>
              </div>
            ) : (
            /* Report Details */
            <div className="space-y-6">
              {/* Edited Notice */}
              {selectedReport.edited_at && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 flex items-center gap-2">
                  <i className="fas fa-info-circle text-yellow-600 dark:text-yellow-400"></i>
                  <span className="text-sm text-yellow-800 dark:text-yellow-200">
                    This report was edited on {new Date(selectedReport.edited_at).toLocaleString()}
                  </span>
                </div>
              )}

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
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Type</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{selectedReport.type}</p>
                </div>
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
                  <div className="space-y-3">
                    {selectedReport.attachments.map((url, index) => {
                      const lowerUrl = url.toLowerCase();
                      // Check for voice/audio first (voice notes contain 'voice' in filename)
                      const isVoiceNote = lowerUrl.includes('voice') || lowerUrl.includes('audio');
                      const isAudio = isVoiceNote || lowerUrl.endsWith('.mp3') || lowerUrl.endsWith('.wav') || lowerUrl.endsWith('.ogg') || lowerUrl.endsWith('.m4a');
                      const isVideo = !isVoiceNote && (lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.mov') || lowerUrl.endsWith('.avi') || lowerUrl.endsWith('.mkv') || lowerUrl.endsWith('.webm'));
                      const isImage = lowerUrl.endsWith('.png') || lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.gif') || lowerUrl.endsWith('.webp') || lowerUrl.endsWith('.svg');

                      if (isVideo) {
                        return (
                          <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                            <video controls className="w-full max-h-96" src={url}>
                              Your browser does not support the video element.
                            </video>
                          </div>
                        );
                      }

                      if (isAudio) {
                        return (
                          <div key={index} className="border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 bg-indigo-50 dark:bg-indigo-900/20">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
                                <i className="fas fa-microphone text-white"></i>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">Voice Note</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Audio recording</p>
                              </div>
                            </div>
                            <audio controls className="w-full h-10" src={url}>
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                        );
                      }

                      if (isImage) {
                        return (
                          <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt={`Attachment ${index + 1}`} className="w-full max-h-64 object-contain bg-gray-100 dark:bg-gray-800" />
                            </a>
                          </div>
                        );
                      }

                      return (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="border border-gray-300 dark:border-gray-600 rounded-xl p-3 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition flex items-center gap-2"
                        >
                          <i className="fas fa-paperclip text-indigo-600"></i>
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                            Attachment {index + 1}
                          </span>
                          <i className="fas fa-external-link-alt text-xs text-gray-400 ml-auto"></i>
                        </a>
                      );
                    })}
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

              {/* Management Section - Only for Admin/PM */}
              {canManageReport() && (
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
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="btn-secondary flex-1"
                  disabled={uploading}
                >
                  Close
                </button>
                {canManageReport() && (
                  <button
                    onClick={handleUpdateReport}
                    disabled={uploading}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {uploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <i className="fas fa-spinner animate-spin"></i>
                        Updating...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <i className="fas fa-save"></i>
                        Save Changes
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Report Modal */}
      {showEditModal && editingReport && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content max-w-2xl animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                  <i className="fas fa-edit mr-2 text-indigo-500"></i>
                  Edit Report
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Update report details</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <i className="fas fa-times text-gray-500"></i>
              </button>
            </div>

            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="input-field"
                  placeholder="Brief summary of the issue or feature"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows={5}
                  className="input-field"
                  placeholder="Detailed description..."
                />
              </div>

              {/* Type and Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                  <select
                    value={editFormData.type}
                    onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                    className="input-field"
                  >
                    <option value="bug">Bug</option>
                    <option value="feature">Feature Request</option>
                    <option value="improvement">Improvement</option>
                    <option value="task">Task</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                  <select
                    value={editFormData.priority}
                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                    className="input-field"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Existing Attachments */}
              {editAttachments.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Attachments
                  </label>
                  <div className="space-y-2">
                    {editAttachments.map((url, index) => {
                      const lowerUrl = url.toLowerCase();
                      const isVoiceNote = lowerUrl.includes('voice') || lowerUrl.includes('audio');
                      const isAudio = isVoiceNote || lowerUrl.endsWith('.mp3') || lowerUrl.endsWith('.wav') || lowerUrl.endsWith('.ogg') || lowerUrl.endsWith('.m4a');
                      const isVideo = !isVoiceNote && (lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.mov') || lowerUrl.endsWith('.webm') || lowerUrl.endsWith('.avi'));
                      const isImage = lowerUrl.endsWith('.png') || lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.gif') || lowerUrl.endsWith('.webp');

                      // Extract filename from URL
                      const fileName = decodeURIComponent(url.split('/').pop() || 'Unknown file');

                      return (
                        <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${isVoiceNote ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800' : 'bg-gray-50 dark:bg-gray-700'}`}>
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isVoiceNote ? 'bg-indigo-500' : isVideo ? 'bg-purple-500' : isImage ? 'bg-green-500' : 'bg-gray-500'}`}>
                              <i className={`fas ${isVoiceNote ? 'fa-microphone' : isVideo ? 'fa-video' : isImage ? 'fa-image' : 'fa-file'} text-white text-sm`}></i>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${isVoiceNote ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                {isVoiceNote ? 'Voice Note' : fileName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {isVoiceNote ? 'Audio Recording' : isVideo ? 'Video' : isImage ? 'Image' : 'File'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveEditAttachment(index)}
                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition ml-2"
                            title="Remove attachment"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add New Attachments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Add New Attachments
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*,.pdf"
                    onChange={handleEditFileChange}
                    className="hidden"
                    id="edit-file-upload"
                  />
                  <label
                    htmlFor="edit-file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <i className="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Click to upload files
                    </span>
                  </label>

                  {newEditFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {newEditFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-800">
                          <div className="flex items-center gap-2">
                            <i className="fas fa-file text-green-600"></i>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                            <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeNewEditFile(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Voice Note Recording */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <i className="fas fa-microphone mr-1"></i>
                  Record New Voice Note
                </label>

                {!editVoiceNote ? (
                  <div className="flex items-center gap-4">
                    {!editIsRecording ? (
                      <button
                        type="button"
                        onClick={startEditRecording}
                        className="flex items-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
                      >
                        <i className="fas fa-microphone"></i>
                        Start Recording
                      </button>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 px-4 py-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            Recording... {formatTime(editRecordingTime)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={stopEditRecording}
                          className="flex items-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-colors"
                        >
                          <i className="fas fa-stop"></i>
                          Stop
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
                    <button
                      type="button"
                      onClick={toggleEditPlayback}
                      className="w-12 h-12 flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 text-white rounded-full transition-colors"
                    >
                      <i className={`fas ${editIsPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                    </button>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-white">
                        New Voice Note Recorded
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Duration: {formatTime(editRecordingTime)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={deleteEditVoiceNote}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete voice note"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary flex-1"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={uploading}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {uploading ? (
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
