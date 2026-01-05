'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Breadcrumb from '@/components/Breadcrumb';
import { ReportCardSkeleton } from '@/components/LoadingSkeleton';
import { NoReportsEmptyState } from '@/components/EmptyState';
import Tooltip from '@/components/Tooltip';
import Button from '@/components/Button';
import { uploadFileDirect } from '@/lib/supabase';

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
  is_admin?: boolean;
}

interface Reply {
  id: string;
  content: string;
  attachments: string[];
  created_at: string;
  user: {
    id: string;
    full_name: string;
    role: string;
  };
}

interface StatusLog {
  id: string;
  old_status: string;
  new_status: string;
  changed_at: string;
  user: {
    id: string;
    full_name: string;
    role: string;
  };
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

  // Reply thread state
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Status log state
  const [statusLog, setStatusLog] = useState<StatusLog[]>([]);
  const [loadingStatusLog, setLoadingStatusLog] = useState(false);

  // Reply attachments state
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const [replyIsRecording, setReplyIsRecording] = useState(false);
  const [replyRecordingTime, setReplyRecordingTime] = useState(0);
  const [replyVoiceNote, setReplyVoiceNote] = useState<Blob | null>(null);
  const [replyVoiceNoteUrl, setReplyVoiceNoteUrl] = useState<string | null>(null);
  const [replyIsPlaying, setReplyIsPlaying] = useState(false);
  const replyMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const replyAudioChunksRef = useRef<Blob[]>([]);
  const replyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const replyAudioRef = useRef<HTMLAudioElement | null>(null);

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

  // Fetch replies for a report
  const fetchReplies = async (reportId: string) => {
    setLoadingReplies(true);
    try {
      const response = await fetch(`/api/reports/${reportId}/replies`);
      if (response.ok) {
        const data = await response.json();
        setReplies(data.replies || []);
      }
    } catch (error) {
      console.error('Error fetching replies:', error);
    } finally {
      setLoadingReplies(false);
    }
  };

  // Fetch status log for a report
  const fetchStatusLog = async (reportId: string) => {
    setLoadingStatusLog(true);
    try {
      const response = await fetch(`/api/reports/${reportId}/status`);
      if (response.ok) {
        const data = await response.json();
        setStatusLog(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching status log:', error);
    } finally {
      setLoadingStatusLog(false);
    }
  };

  // Send a reply
  const handleSendReply = async () => {
    if (!selectedReport || (!replyContent.trim() && replyAttachments.length === 0 && !replyVoiceNote)) return;

    setSendingReply(true);
    try {
      // Upload attachments directly to Supabase (bypasses Vercel 4.5MB limit)
      const uploadedUrls: string[] = [];

      // Upload regular files
      for (const file of replyAttachments) {
        const url = await uploadFileDirect(file);
        if (url) {
          uploadedUrls.push(url);
        }
      }

      // Upload voice note if exists
      if (replyVoiceNote) {
        const voiceFile = new File([replyVoiceNote], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
        const url = await uploadFileDirect(voiceFile);
        if (url) {
          uploadedUrls.push(url);
        }
      }

      const response = await fetch(`/api/reports/${selectedReport.id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyContent.trim() || '(Attachment)',
          attachments: uploadedUrls
        })
      });

      if (response.ok) {
        const newReply = await response.json();
        setReplies(prev => [...prev, newReply]);
        setReplyContent('');
        setReplyAttachments([]);
        deleteReplyVoiceNote();
        // Refresh reports to get updated status
        fetchReports();
        // Refresh status log
        fetchStatusLog(selectedReport.id);
      } else {
        const errorData = await response.json();
        console.error('Reply API error:', errorData);
        alert('Failed to send reply: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Error sending reply. Please try again.');
    } finally {
      setSendingReply(false);
    }
  };

  // Update report status
  const handleStatusChange = async (newStatus: string) => {
    if (!selectedReport) return;

    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/reports/${selectedReport.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        // Update local state
        setSelectedReport({ ...selectedReport, status: newStatus as Report['status'] });
        // Refresh reports list
        fetchReports();
        // Refresh status log
        fetchStatusLog(selectedReport.id);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Check if user can change status
  const canChangeStatus = (toStatus: string) => {
    if (!currentUser || !selectedReport) return false;

    const isAdmin = currentUser.is_admin;
    const isPM = currentUser.role === 'project_manager' || currentUser.role === 'cto';
    const isDeveloper = currentUser.role === 'developer' || currentUser.role === 'react_native_developer';
    const isTester = currentUser.role === 'tester';
    const isReporter = selectedReport.reported_by === currentUser.id;

    // Admins and PMs can do anything
    if (isAdmin || isPM) return true;

    // Developers can mark as in_progress
    if (isDeveloper && toStatus === 'in_progress') return true;

    // Testers or reporters can mark as resolved (approve)
    if ((isTester || isReporter) && toStatus === 'resolved') return true;

    return false;
  };

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      project_manager: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      cto: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      developer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      react_native_developer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      tester: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      consultant: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[role] || colors.consultant;
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

  // Reply voice recording functions
  const startReplyRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      replyMediaRecorderRef.current = mediaRecorder;
      replyAudioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          replyAudioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(replyAudioChunksRef.current, { type: 'audio/webm' });
        setReplyVoiceNote(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setReplyVoiceNoteUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setReplyIsRecording(true);
      setReplyRecordingTime(0);

      replyTimerRef.current = setInterval(() => {
        setReplyRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please ensure microphone permissions are granted.');
    }
  };

  const stopReplyRecording = () => {
    if (replyMediaRecorderRef.current && replyIsRecording) {
      replyMediaRecorderRef.current.stop();
      setReplyIsRecording(false);
      if (replyTimerRef.current) {
        clearInterval(replyTimerRef.current);
        replyTimerRef.current = null;
      }
    }
  };

  const deleteReplyVoiceNote = () => {
    if (replyVoiceNoteUrl) {
      URL.revokeObjectURL(replyVoiceNoteUrl);
    }
    setReplyVoiceNote(null);
    setReplyVoiceNoteUrl(null);
    setReplyRecordingTime(0);
    setReplyIsPlaying(false);
    if (replyAudioRef.current) {
      replyAudioRef.current.pause();
      replyAudioRef.current = null;
    }
  };

  const toggleReplyPlayback = () => {
    if (!replyVoiceNoteUrl) return;

    if (replyIsPlaying && replyAudioRef.current) {
      replyAudioRef.current.pause();
      setReplyIsPlaying(false);
    } else {
      if (!replyAudioRef.current) {
        replyAudioRef.current = new Audio(replyVoiceNoteUrl);
        replyAudioRef.current.onended = () => setReplyIsPlaying(false);
      }
      replyAudioRef.current.play();
      setReplyIsPlaying(true);
    }
  };

  const handleReplyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setReplyAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeReplyFile = (index: number) => {
    setReplyAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateReport = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please fill in title and description');
      return;
    }

    setUploading(true);
    try {
      // Upload attachments directly to Supabase (bypasses Vercel 4.5MB limit)
      const uploadedUrls: string[] = [];

      // Upload regular files
      for (const file of attachments) {
        const url = await uploadFileDirect(file);
        if (url) {
          uploadedUrls.push(url);
        } else {
          console.error('Failed to upload file:', file.name);
        }
      }

      // Upload voice note if exists
      if (voiceNote) {
        const voiceFile = new File([voiceNote], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
        const url = await uploadFileDirect(voiceFile);
        if (url) {
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
    // Fetch replies for this report
    setReplies([]);
    setReplyContent('');
    setReplyAttachments([]);
    deleteReplyVoiceNote();
    setStatusLog([]);
    fetchReplies(report.id);
    fetchStatusLog(report.id);
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
        <Breadcrumb items={[
          { label: 'Projects', href: '/dashboard/projects' },
          { label: 'Project', href: `/dashboard/project/${projectId}` },
          { label: 'Reports' }
        ]} />
        <div className="space-y-4">
          <ReportCardSkeleton />
          <ReportCardSkeleton />
          <ReportCardSkeleton />
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
        { label: 'Reports', icon: 'fas fa-bug' }
      ]} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            <i className="fas fa-bug mr-2 text-orange-500"></i>
            Reports & Issues
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track bugs, features, and improvements</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          icon="fas fa-plus"
        >
          New Report
        </Button>
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
          <NoReportsEmptyState onCreateReport={() => setShowCreateModal(true)} />
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
                      <Tooltip content="Edit report">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditReport(report);
                          }}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                      </Tooltip>
                      <Tooltip content="Delete report">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteReport(report.id);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </Tooltip>
                    </>
                  )}
                  <Tooltip content="View details">
                    <button className="btn-primary">
                      <i className="fas fa-eye mr-1"></i>
                      View
                    </button>
                  </Tooltip>
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
          <div className="modal-content max-w-5xl animate-fadeIn flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {/* Sticky Header with Title and Status */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 pb-4 border-b dark:border-gray-700 -mx-6 px-6 pt-1 -mt-1">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl flex-shrink-0">{getTypeEmoji(selectedReport.type)}</span>
                  <h3 className={`text-lg md:text-xl font-bold truncate ${selectedReport.is_deleted ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                    {selectedReport.title}
                  </h3>

                  {/* Status Dropdown - Inline with title */}
                  {!selectedReport.is_deleted && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select
                        value={selectedReport.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={updatingStatus || !(
                          currentUser?.is_admin ||
                          currentUser?.role === 'project_manager' ||
                          currentUser?.role === 'cto' ||
                          (selectedReport.status === 'open' && (currentUser?.role === 'developer' || currentUser?.role === 'react_native_developer')) ||
                          (selectedReport.status === 'in_progress')
                        )}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border-0 cursor-pointer transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                          selectedReport.status === 'open'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : selectedReport.status === 'in_progress'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : selectedReport.status === 'resolved'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        }`}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                      {updatingStatus && (
                        <i className="fas fa-spinner animate-spin text-indigo-500"></i>
                      )}
                    </div>
                  )}

                  {/* Priority Badge */}
                  {!selectedReport.is_deleted && getPriorityBadge(selectedReport.priority)}

                  {/* Tags */}
                  {selectedReport.is_deleted && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs font-medium rounded-full flex-shrink-0">
                      <i className="fas fa-trash mr-1"></i> Deleted
                    </span>
                  )}
                  {selectedReport.edited_at && !selectedReport.is_deleted && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs font-medium rounded-full flex-shrink-0">
                      <i className="fas fa-edit mr-1"></i> Edited
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
                >
                  <i className="fas fa-times text-gray-500 text-lg"></i>
                </button>
              </div>
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
            /* Report Details - Scrollable content */
            <div className="space-y-6 overflow-y-auto flex-1 mt-4">
              {/* Status Change Log */}
              {statusLog.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <i className="fas fa-history text-indigo-500"></i>
                    Status History
                  </h4>
                  <div className="space-y-2">
                    {statusLog.map((log, index) => (
                      <div key={log.id} className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0"></div>
                        <div className="flex-1 flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            log.old_status === 'open' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            log.old_status === 'in_progress' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            {log.old_status.replace('_', ' ')}
                          </span>
                          <i className="fas fa-arrow-right text-gray-400 text-xs"></i>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            log.new_status === 'open' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            log.new_status === 'in_progress' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            {log.new_status.replace('_', ' ')}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">by</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{log.user.full_name}</span>
                          <span className="text-gray-400 dark:text-gray-500 text-xs">
                            ({log.user.role.replace('_', ' ')})
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                          {new Date(log.changed_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {loadingStatusLog && (
                <div className="flex items-center justify-center py-4">
                  <i className="fas fa-spinner animate-spin text-indigo-500 mr-2"></i>
                  <span className="text-sm text-gray-500">Loading status history...</span>
                </div>
              )}

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
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <i className="fas fa-align-left text-indigo-500"></i>
                  Description
                </h4>
                <div className="text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl whitespace-pre-wrap text-sm leading-relaxed max-h-64 overflow-y-auto">
                  {selectedReport.description}
                </div>
              </div>

              {/* Metadata Grid */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <i className="fas fa-info-circle text-indigo-500"></i>
                  Details
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Type</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{selectedReport.type}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reported By</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{selectedReport.reported_by_user.full_name}</p>
                  </div>
                  {selectedReport.assigned_to_user && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Assigned To</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{selectedReport.assigned_to_user.full_name}</p>
                    </div>
                  )}
                  {selectedReport.version && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Version</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedReport.version.version_number}</p>
                    </div>
                  )}
                  {selectedReport.browser && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Browser</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedReport.browser}</p>
                    </div>
                  )}
                  {selectedReport.device && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Device</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedReport.device}</p>
                    </div>
                  )}
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Created</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(selectedReport.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Voice Notes Section */}
              {selectedReport.attachments.length > 0 && (() => {
                // Separate voice notes from other attachments
                const voiceNotes = selectedReport.attachments.filter((url: string) => {
                  const lower = url.toLowerCase();
                  // Voice notes: contain 'voice', 'audio', or are .webm files (recorder uses webm)
                  return lower.includes('voice') || lower.includes('audio') ||
                         lower.endsWith('.webm') || lower.endsWith('.mp3') ||
                         lower.endsWith('.wav') || lower.endsWith('.ogg') || lower.endsWith('.m4a');
                });

                const otherAttachments = selectedReport.attachments.filter((url: string) => {
                  const lower = url.toLowerCase();
                  return !(lower.includes('voice') || lower.includes('audio') ||
                           lower.endsWith('.webm') || lower.endsWith('.mp3') ||
                           lower.endsWith('.wav') || lower.endsWith('.ogg') || lower.endsWith('.m4a'));
                });

                return (
                  <>
                    {/* Voice Notes */}
                    {voiceNotes.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                          <i className="fas fa-microphone text-indigo-500"></i>
                          Voice Note{voiceNotes.length > 1 ? 's' : ''} ({voiceNotes.length})
                        </h4>
                        <div className="space-y-3">
                          {voiceNotes.map((url: string, index: number) => (
                            <div key={`voice-${index}`} className="border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 bg-indigo-50 dark:bg-indigo-900/20">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                                  <i className="fas fa-microphone text-white"></i>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">Voice Note {voiceNotes.length > 1 ? index + 1 : ''}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Audio recording</p>
                                </div>
                              </div>
                              <audio controls className="w-full h-10" src={url}>
                                Your browser does not support the audio element.
                              </audio>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Other Attachments */}
                    {otherAttachments.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                          <i className="fas fa-paperclip text-indigo-500"></i>
                          Attachments ({otherAttachments.length})
                        </h4>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                          {otherAttachments.map((url: string, index: number) => {
                            const lowerUrl = url.toLowerCase();
                            const isVideo = lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.mov') || lowerUrl.endsWith('.avi') || lowerUrl.endsWith('.mkv');
                            const isImage = lowerUrl.endsWith('.png') || lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.gif') || lowerUrl.endsWith('.webp') || lowerUrl.endsWith('.svg');

                            if (isVideo) {
                              return (
                                <div key={`attach-${index}`} className="border border-purple-200 dark:border-purple-800 rounded-xl overflow-hidden bg-purple-50 dark:bg-purple-900/20">
                                  <div className="flex items-center gap-2 px-3 py-2 border-b border-purple-200 dark:border-purple-800">
                                    <i className="fas fa-video text-purple-500"></i>
                                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Video</span>
                                  </div>
                                  <video
                                    controls
                                    playsInline
                                    preload="metadata"
                                    className="w-full max-h-72"
                                  >
                                    <source src={url} type="video/mp4" />
                                    <source src={url} type="video/webm" />
                                    <source src={url} type="video/quicktime" />
                                    Your browser does not support the video element.
                                  </video>
                                  <div className="flex items-center justify-between px-3 py-2 bg-purple-100 dark:bg-purple-900/40">
                                    <span className="text-xs text-purple-600 dark:text-purple-400">
                                      <i className="fas fa-info-circle mr-1"></i>
                                      Video not playing? Download to view (HEVC codec not supported in browser)
                                    </span>
                                    <a
                                      href={url}
                                      download
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition"
                                    >
                                      <i className="fas fa-download"></i>
                                      Download
                                    </a>
                                  </div>
                                </div>
                              );
                            }

                            if (isImage) {
                              return (
                                <div key={`attach-${index}`} className="border border-green-200 dark:border-green-800 rounded-xl overflow-hidden bg-green-50 dark:bg-green-900/20">
                                  <div className="flex items-center gap-2 px-3 py-2 border-b border-green-200 dark:border-green-800">
                                    <i className="fas fa-image text-green-500"></i>
                                    <span className="text-sm font-medium text-green-700 dark:text-green-300">Image</span>
                                    <a href={url} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-green-600 hover:underline flex items-center gap-1">
                                      Open full size <i className="fas fa-external-link-alt"></i>
                                    </a>
                                  </div>
                                  <a href={url} target="_blank" rel="noopener noreferrer">
                                    <img src={url} alt={`Attachment ${index + 1}`} className="w-full max-h-56 object-contain bg-white dark:bg-gray-800" />
                                  </a>
                                </div>
                              );
                            }

                            // Other files
                            const fileName = decodeURIComponent(url.split('/').pop() || 'Unknown file');
                            return (
                              <a
                                key={`attach-${index}`}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block border border-gray-300 dark:border-gray-600 rounded-xl p-3 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <i className="fas fa-file text-gray-500 dark:text-gray-400"></i>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{fileName}</p>
                                    <p className="text-xs text-gray-500">File attachment</p>
                                  </div>
                                  <i className="fas fa-external-link-alt text-gray-400 flex-shrink-0"></i>
                                </div>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Developer Notes */}
              {selectedReport.dev_notes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <i className="fas fa-code text-yellow-500"></i>
                    Developer Notes
                  </h4>
                  <div className="text-gray-900 dark:text-gray-100 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-xl whitespace-pre-wrap text-sm max-h-48 overflow-y-auto">
                    {selectedReport.dev_notes}
                  </div>
                </div>
              )}

              {/* Reply Thread Section */}
              <div className="border-t dark:border-gray-700 pt-6">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <i className="fas fa-comments text-indigo-500"></i>
                  Discussion Thread
                  {replies.length > 0 && (
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                      ({replies.length} {replies.length === 1 ? 'reply' : 'replies'})
                    </span>
                  )}
                </h4>

                {/* Replies List */}
                <div className="space-y-4 max-h-80 overflow-y-auto mb-4">
                  {loadingReplies ? (
                    <div className="flex items-center justify-center py-8">
                      <i className="fas fa-spinner animate-spin text-indigo-500 text-2xl"></i>
                    </div>
                  ) : replies.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <i className="fas fa-comment-slash text-3xl text-gray-300 dark:text-gray-600 mb-2"></i>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No replies yet</p>
                      <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Be the first to respond to this report</p>
                    </div>
                  ) : (
                    replies.map((reply) => (
                      <div
                        key={reply.id}
                        className={`p-4 rounded-xl ${
                          reply.user.id === currentUser?.id
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 ml-8'
                            : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mr-8'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            reply.user.role === 'developer' || reply.user.role === 'react_native_developer'
                              ? 'bg-blue-500'
                              : reply.user.role === 'tester'
                              ? 'bg-orange-500'
                              : reply.user.role === 'project_manager'
                              ? 'bg-purple-500'
                              : 'bg-gray-500'
                          }`}>
                            <span className="text-white font-semibold text-sm">
                              {reply.user.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-medium text-gray-900 dark:text-white text-sm">
                                {reply.user.full_name}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(reply.user.role)}`}>
                                {reply.user.role.replace('_', ' ')}
                              </span>
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {new Date(reply.created_at).toLocaleString()}
                              </span>
                            </div>
                            {reply.content !== '(Attachment)' && (
                              <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                                {reply.content}
                              </p>
                            )}

                            {/* Reply Attachments */}
                            {reply.attachments && reply.attachments.length > 0 && (
                              <div className="mt-2 space-y-2">
                                {reply.attachments.map((url: string, idx: number) => {
                                  const lowerUrl = url.toLowerCase();
                                  const isVoiceNote = lowerUrl.includes('voice') || lowerUrl.includes('audio') || lowerUrl.endsWith('.webm');
                                  const isAudio = isVoiceNote || lowerUrl.endsWith('.mp3') || lowerUrl.endsWith('.wav') || lowerUrl.endsWith('.ogg') || lowerUrl.endsWith('.m4a');
                                  const isVideo = !isVoiceNote && (lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.mov') || lowerUrl.endsWith('.avi'));
                                  const isImage = lowerUrl.endsWith('.png') || lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.gif') || lowerUrl.endsWith('.webp');

                                  if (isAudio) {
                                    return (
                                      <div key={idx} className="bg-indigo-100 dark:bg-indigo-900/30 rounded-lg p-2">
                                        <div className="flex items-center gap-2 mb-1">
                                          <i className="fas fa-microphone text-indigo-600 dark:text-indigo-400 text-sm"></i>
                                          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Voice Note</span>
                                        </div>
                                        <audio controls className="w-full h-8" src={url}>
                                          Your browser does not support the audio element.
                                        </audio>
                                      </div>
                                    );
                                  }

                                  if (isVideo) {
                                    return (
                                      <div key={idx} className="bg-purple-100 dark:bg-purple-900/30 rounded-lg overflow-hidden">
                                        <video
                                          controls
                                          playsInline
                                          preload="metadata"
                                          className="w-full max-h-48"
                                        >
                                          <source src={url} type="video/mp4" />
                                          <source src={url} type="video/webm" />
                                          <source src={url} type="video/quicktime" />
                                          Your browser does not support the video element.
                                        </video>
                                        <div className="flex items-center justify-between px-2 py-1.5">
                                          <span className="text-xs text-purple-600 dark:text-purple-400">
                                            Not playing? Download
                                          </span>
                                          <a
                                            href={url}
                                            download
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 px-2 py-0.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded"
                                          >
                                            <i className="fas fa-download"></i>
                                          </a>
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (isImage) {
                                    return (
                                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                                        <img src={url} alt="Attachment" className="max-w-full max-h-48 rounded-lg" />
                                      </a>
                                    );
                                  }

                                  const fileName = decodeURIComponent(url.split('/').pop() || 'File');
                                  return (
                                    <a
                                      key={idx}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                                    >
                                      <i className="fas fa-file"></i>
                                      {fileName}
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Reply Input */}
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-sm">
                      {currentUser?.full_name.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write a reply... (Developers: your reply will mark this as 'In Progress')"
                      rows={3}
                      className="input-field resize-none"
                    />

                    {/* Attachments Preview */}
                    {(replyAttachments.length > 0 || replyVoiceNote) && (
                      <div className="mt-2 space-y-2">
                        {replyAttachments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded-lg text-sm">
                            <div className="flex items-center gap-2">
                              <i className="fas fa-file text-gray-500"></i>
                              <span className="text-gray-700 dark:text-gray-300 truncate max-w-xs">{file.name}</span>
                              <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeReplyFile(index)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ))}

                        {replyVoiceNote && (
                          <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                            <button
                              type="button"
                              onClick={toggleReplyPlayback}
                              className="w-10 h-10 flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 text-white rounded-full transition-colors"
                            >
                              <i className={`fas ${replyIsPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                            </button>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800 dark:text-white">Voice Note</p>
                              <p className="text-xs text-gray-500">{formatTime(replyRecordingTime)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={deleteReplyVoiceNote}
                              className="p-2 text-red-500 hover:text-red-700"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center justify-between mt-3 gap-3">
                      <div className="flex items-center gap-2">
                        {/* File Upload */}
                        <input
                          type="file"
                          multiple
                          accept="image/*,video/*,audio/*,.pdf"
                          onChange={handleReplyFileChange}
                          className="hidden"
                          id="reply-file-upload"
                        />
                        <label
                          htmlFor="reply-file-upload"
                          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg cursor-pointer transition"
                          title="Attach file"
                        >
                          <i className="fas fa-paperclip"></i>
                        </label>

                        {/* Voice Recording */}
                        {!replyVoiceNote && (
                          <>
                            {!replyIsRecording ? (
                              <button
                                type="button"
                                onClick={startReplyRecording}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                title="Record voice note"
                              >
                                <i className="fas fa-microphone"></i>
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                  <span className="text-red-600 dark:text-red-400 text-sm font-medium">
                                    {formatTime(replyRecordingTime)}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={stopReplyRecording}
                                  className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition"
                                  title="Stop recording"
                                >
                                  <i className="fas fa-stop"></i>
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <button
                        onClick={handleSendReply}
                        disabled={sendingReply || (!replyContent.trim() && replyAttachments.length === 0 && !replyVoiceNote)}
                        className="btn-primary disabled:opacity-50"
                      >
                        {sendingReply ? (
                          <span className="flex items-center gap-2">
                            <i className="fas fa-spinner animate-spin"></i>
                            Sending...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <i className="fas fa-paper-plane"></i>
                            Send Reply
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Management Section - Only for Admin/PM */}
              {canManageReport() && (
                <div className="border-t dark:border-gray-700 pt-6 mt-6">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <i className="fas fa-cog text-indigo-500"></i>
                    Manage Report
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    {/* Developer Notes - Full width */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Developer Notes</label>
                      <textarea
                        value={editData.dev_notes}
                        onChange={(e) => setEditData({ ...editData, dev_notes: e.target.value })}
                        rows={3}
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
