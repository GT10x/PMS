'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Breadcrumb from '@/components/Breadcrumb';
import AccessDenied from '@/components/AccessDenied';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { supabase } from '@/lib/supabase';

interface Module {
  id: string;
  name: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'planned' | 'in_progress' | 'completed' | 'on_hold';
  eta: string | null;
  stakeholders: string[];
  phase: number;
  code?: string;
  created_at: string;
  updated_at: string;
  created_by_user?: { id: string; full_name: string };
}

interface EntityConnection {
  id: string;
  project_id: string;
  source_type: 'module' | 'function';
  source_id: string;
  target_type: 'module' | 'function';
  target_id: string;
  created_at: string;
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

interface FeatureRemark {
  id: string;
  feature_id: string;
  content: string | null;
  image_url: string | null;
  voice_url: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  created_by_user?: { id: string; full_name: string };
}

interface RemarkReply {
  id: string;
  remark_id: string;
  content: string | null;
  image_url: string | null;
  voice_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  created_by_user?: { id: string; full_name: string };
}

interface ModuleFeature {
  id: string;
  module_id: string;
  name: string;
  phase: number;
  sort_order: number;
  code?: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  remarks: FeatureRemark[];
  created_by_user?: { id: string; full_name: string };
}

// Master Admin ID - only this user can delete modules and features
const MASTER_ADMIN_ID = 'd60a4c5e-aa9f-4cdb-999a-41f0bd23d09e';

export default function ProjectModulesPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  // Check module access
  const { hasAccess, loading: accessLoading } = useModuleAccess(projectId, 'modules');

  const [project, setProject] = useState<Project | null>(null);
  const [projectStakeholders, setProjectStakeholders] = useState<string[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Inline editing states
  const [editingFeature, setEditingFeature] = useState<{ moduleId: string; index: number } | null>(null);
  const [editingFeatureText, setEditingFeatureText] = useState('');
  const [addingFeature, setAddingFeature] = useState<string | null>(null);
  const [newFeatureText, setNewFeatureText] = useState('');

  // Drag and drop state
  const [draggedFeature, setDraggedFeature] = useState<{ moduleId: string; index: number } | null>(null);
  const [draggedModule, setDraggedModule] = useState<number | null>(null);

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
    stakeholders: [] as string[],
    phase: 1
  });

  // Features as array for numbered inputs
  const [featuresList, setFeaturesList] = useState<string[]>(['']);

  // Remarks for features in the Add/Edit modal (indexed by feature index)
  interface ModalRemark {
    content: string;
    image_url: string | null;
    voice_url: string | null;
  }
  const [modalFeatureRemarks, setModalFeatureRemarks] = useState<Map<number, ModalRemark[]>>(new Map());
  const [addingModalRemark, setAddingModalRemark] = useState<number | null>(null);
  const [modalRemarkContent, setModalRemarkContent] = useState('');
  const [modalRemarkImage, setModalRemarkImage] = useState<string | null>(null);
  const [modalRemarkVoice, setModalRemarkVoice] = useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingFor, setRecordingFor] = useState<'modal' | 'inline' | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // New: Features from database (per module)
  const [moduleFeatures, setModuleFeatures] = useState<Map<string, ModuleFeature[]>>(new Map());
  const [loadingFeatures, setLoadingFeatures] = useState<Set<string>>(new Set());

  // Remark states
  const [addingRemarkToFeature, setAddingRemarkToFeature] = useState<string | null>(null);
  const [newRemarkContent, setNewRemarkContent] = useState('');
  const [newRemarkImage, setNewRemarkImage] = useState<string | null>(null);
  const [newRemarkVoice, setNewRemarkVoice] = useState<string | null>(null);
  const [editingRemark, setEditingRemark] = useState<{ id: string; featureId: string; content: string; imageUrl: string | null; voiceUrl: string | null } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [savingRemark, setSavingRemark] = useState(false);

  // Thread/Reply states
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [remarkReplies, setRemarkReplies] = useState<Map<string, RemarkReply[]>>(new Map());
  const [loadingReplies, setLoadingReplies] = useState<Set<string>>(new Set());
  const [replyingToRemark, setReplyingToRemark] = useState<string | null>(null);
  const [newReplyContent, setNewReplyContent] = useState('');
  const [newReplyImage, setNewReplyImage] = useState<string | null>(null);
  const [newReplyVoice, setNewReplyVoice] = useState<string | null>(null);
  const [savingReply, setSavingReply] = useState(false);
  const [replyCounts, setReplyCounts] = useState<Map<string, number>>(new Map());

  // Connections state
  const [connections, setConnections] = useState<EntityConnection[]>([]);
  const [showConnectionModal, setShowConnectionModal] = useState<{ type: 'module' | 'function'; id: string; name: string; code: string } | null>(null);
  const [selectedConnections, setSelectedConnections] = useState<{ target_type: 'module' | 'function'; target_id: string }[]>([]);
  const [savingConnections, setSavingConnections] = useState(false);

  // Speech-to-text state
  const [listeningIndex, setListeningIndex] = useState<number | null>(null);
  const [inlineListening, setInlineListening] = useState<'edit' | 'add' | null>(null);
  const inlineRecognitionRef = useRef<any>(null);
  const inlineShouldRestartRef = useRef<boolean>(false);
  const inlineTypeRef = useRef<'edit' | 'add' | null>(null);
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

  // Inline speech recognition for edit/add feature in expanded cards
  const startInlineListening = (type: 'edit' | 'add') => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    // Stop any existing recognition
    if (inlineRecognitionRef.current) {
      inlineShouldRestartRef.current = false;
      inlineRecognitionRef.current.stop();
    }

    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = false;
    recog.lang = 'en-US';

    // Use refs to track state for callbacks
    inlineShouldRestartRef.current = true;
    inlineTypeRef.current = type;
    setInlineListening(type);

    recog.onresult = (event: any) => {
      const lastResultIndex = event.results.length - 1;
      const transcript = event.results[lastResultIndex][0].transcript;

      // Use ref to check current type
      if (inlineTypeRef.current === 'edit') {
        setEditingFeatureText(prev => prev ? prev + ' ' + transcript : transcript);
      } else if (inlineTypeRef.current === 'add') {
        setNewFeatureText(prev => prev ? prev + ' ' + transcript : transcript);
      }
    };

    recog.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        alert('Microphone access denied.');
        inlineShouldRestartRef.current = false;
        setInlineListening(null);
      }
      // Don't stop on no-speech, just continue
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        inlineShouldRestartRef.current = false;
        setInlineListening(null);
      }
    };

    recog.onend = () => {
      // Use ref to check if we should restart (not stale state)
      if (inlineShouldRestartRef.current) {
        try {
          recog.start();
        } catch (e) {
          // Ignore restart errors
        }
      } else {
        setInlineListening(null);
      }
    };

    inlineRecognitionRef.current = recog;
    try {
      recog.start();
    } catch (e) {
      inlineShouldRestartRef.current = false;
      setInlineListening(null);
    }
  };

  const stopInlineListening = () => {
    inlineShouldRestartRef.current = false;
    inlineTypeRef.current = null;
    if (inlineRecognitionRef.current) {
      inlineRecognitionRef.current.stop();
      inlineRecognitionRef.current = null;
    }
    setInlineListening(null);
  };

  useEffect(() => {
    fetchProject();
    fetchProjectStakeholders();
    fetchModules();
    fetchCurrentUser();
    fetchConnections();
  }, []);

  // Supabase Realtime subscription for instant remark updates
  useEffect(() => {
    const channel = supabase
      .channel('remarks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feature_remarks' },
        async (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          if (eventType === 'INSERT' && newRecord) {
            // Fetch the creator info for the new remark
            let creatorInfo = null;
            if (newRecord.created_by) {
              try {
                const res = await fetch(`/api/users/${newRecord.created_by}`);
                if (res.ok) {
                  const data = await res.json();
                  creatorInfo = { id: data.user.id, full_name: data.user.full_name };
                }
              } catch (e) {
                console.error('Error fetching creator info:', e);
              }
            }

            const newRemark: FeatureRemark = {
              id: newRecord.id,
              feature_id: newRecord.feature_id,
              content: newRecord.content,
              image_url: newRecord.image_url,
              voice_url: newRecord.voice_url,
              sort_order: newRecord.sort_order || 0,
              created_by: newRecord.created_by,
              created_at: newRecord.created_at,
              updated_at: newRecord.updated_at,
              created_by_user: creatorInfo || undefined
            };

            setModuleFeatures(prev => {
              const newMap = new Map(prev);
              // Find which module this feature belongs to
              for (const [moduleId, features] of newMap) {
                const featureIndex = features.findIndex(f => f.id === newRecord.feature_id);
                if (featureIndex !== -1) {
                  const updatedFeatures = [...features];
                  // Check if remark already exists (to avoid duplicates)
                  if (!updatedFeatures[featureIndex].remarks.some(r => r.id === newRemark.id)) {
                    updatedFeatures[featureIndex] = {
                      ...updatedFeatures[featureIndex],
                      remarks: [...updatedFeatures[featureIndex].remarks, newRemark]
                    };
                    newMap.set(moduleId, updatedFeatures);
                  }
                  break;
                }
              }
              return newMap;
            });
          }

          if (eventType === 'UPDATE' && newRecord) {
            setModuleFeatures(prev => {
              const newMap = new Map(prev);
              for (const [moduleId, features] of newMap) {
                const featureIndex = features.findIndex(f => f.id === newRecord.feature_id);
                if (featureIndex !== -1) {
                  const updatedFeatures = [...features];
                  const remarkIndex = updatedFeatures[featureIndex].remarks.findIndex(r => r.id === newRecord.id);
                  if (remarkIndex !== -1) {
                    const existingRemark = updatedFeatures[featureIndex].remarks[remarkIndex];
                    updatedFeatures[featureIndex] = {
                      ...updatedFeatures[featureIndex],
                      remarks: [
                        ...updatedFeatures[featureIndex].remarks.slice(0, remarkIndex),
                        {
                          ...existingRemark,
                          content: newRecord.content,
                          image_url: newRecord.image_url,
                          voice_url: newRecord.voice_url,
                          updated_at: newRecord.updated_at
                        },
                        ...updatedFeatures[featureIndex].remarks.slice(remarkIndex + 1)
                      ]
                    };
                    newMap.set(moduleId, updatedFeatures);
                  }
                  break;
                }
              }
              return newMap;
            });
          }

          if (eventType === 'DELETE' && oldRecord) {
            setModuleFeatures(prev => {
              const newMap = new Map(prev);
              for (const [moduleId, features] of newMap) {
                const featureIndex = features.findIndex(f => f.remarks.some(r => r.id === oldRecord.id));
                if (featureIndex !== -1) {
                  const updatedFeatures = [...features];
                  updatedFeatures[featureIndex] = {
                    ...updatedFeatures[featureIndex],
                    remarks: updatedFeatures[featureIndex].remarks.filter(r => r.id !== oldRecord.id)
                  };
                  newMap.set(moduleId, updatedFeatures);
                  break;
                }
              }
              return newMap;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Supabase Realtime subscription for instant reply updates
  useEffect(() => {
    const channel = supabase
      .channel('replies-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'remark_replies' },
        async (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          if (eventType === 'INSERT' && newRecord) {
            // Fetch the creator info for the new reply
            let creatorInfo = null;
            if (newRecord.created_by) {
              try {
                const res = await fetch(`/api/users/${newRecord.created_by}`);
                if (res.ok) {
                  const data = await res.json();
                  creatorInfo = { id: data.user.id, full_name: data.user.full_name };
                }
              } catch (e) {
                console.error('Error fetching creator info:', e);
              }
            }

            const newReply: RemarkReply = {
              id: newRecord.id,
              remark_id: newRecord.remark_id,
              content: newRecord.content,
              image_url: newRecord.image_url,
              voice_url: newRecord.voice_url,
              created_by: newRecord.created_by,
              created_at: newRecord.created_at,
              updated_at: newRecord.updated_at,
              created_by_user: creatorInfo || undefined
            };

            // Update replies if this remark's thread is loaded
            setRemarkReplies(prev => {
              if (!prev.has(newRecord.remark_id)) return prev;
              const newMap = new Map(prev);
              const existing = newMap.get(newRecord.remark_id) || [];
              // Avoid duplicates
              if (!existing.some(r => r.id === newReply.id)) {
                newMap.set(newRecord.remark_id, [...existing, newReply]);
              }
              return newMap;
            });

            // Update reply count
            setReplyCounts(prev => new Map(prev).set(newRecord.remark_id, (prev.get(newRecord.remark_id) || 0) + 1));
          }

          if (eventType === 'UPDATE' && newRecord) {
            setRemarkReplies(prev => {
              if (!prev.has(newRecord.remark_id)) return prev;
              const newMap = new Map(prev);
              const existing = newMap.get(newRecord.remark_id) || [];
              const replyIndex = existing.findIndex(r => r.id === newRecord.id);
              if (replyIndex !== -1) {
                const updatedReplies = [...existing];
                updatedReplies[replyIndex] = {
                  ...updatedReplies[replyIndex],
                  content: newRecord.content,
                  image_url: newRecord.image_url,
                  voice_url: newRecord.voice_url,
                  updated_at: newRecord.updated_at
                };
                newMap.set(newRecord.remark_id, updatedReplies);
              }
              return newMap;
            });
          }

          if (eventType === 'DELETE' && oldRecord) {
            setRemarkReplies(prev => {
              if (!prev.has(oldRecord.remark_id)) return prev;
              const newMap = new Map(prev);
              const existing = newMap.get(oldRecord.remark_id) || [];
              newMap.set(oldRecord.remark_id, existing.filter(r => r.id !== oldRecord.id));
              return newMap;
            });
            setReplyCounts(prev => new Map(prev).set(oldRecord.remark_id, Math.max(0, (prev.get(oldRecord.remark_id) || 0) - 1)));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Supabase Realtime subscription for instant feature (function) updates
  useEffect(() => {
    const channel = supabase
      .channel('features-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'module_features' },
        async (payload) => {
          console.log('[Realtime] Feature event received:', payload);
          const { eventType, new: newRecord, old: oldRecord } = payload;

          if (eventType === 'INSERT' && newRecord) {
            // Fetch the creator info for the new feature
            let creatorInfo = null;
            if (newRecord.created_by) {
              try {
                const res = await fetch(`/api/users/${newRecord.created_by}`);
                if (res.ok) {
                  const data = await res.json();
                  creatorInfo = { id: data.user.id, full_name: data.user.full_name };
                }
              } catch (e) {
                console.error('Error fetching creator info:', e);
              }
            }

            const newFeature: ModuleFeature = {
              id: newRecord.id,
              module_id: newRecord.module_id,
              name: newRecord.name,
              phase: newRecord.phase || 1,
              sort_order: newRecord.sort_order || 0,
              code: newRecord.code,
              created_by: newRecord.created_by,
              created_at: newRecord.created_at,
              updated_at: newRecord.updated_at,
              remarks: [],
              created_by_user: creatorInfo || undefined
            };

            setModuleFeatures(prev => {
              const newMap = new Map(prev);
              console.log('[Realtime] Module ID from event:', newRecord.module_id);
              console.log('[Realtime] moduleFeatures has this module:', newMap.has(newRecord.module_id));
              console.log('[Realtime] moduleFeatures keys:', Array.from(newMap.keys()));
              // Only update if module's features are already loaded (module was expanded)
              // Otherwise, the full list will be fetched when user expands the module
              if (newMap.has(newRecord.module_id)) {
                const existingFeatures = newMap.get(newRecord.module_id) || [];
                // Check if feature already exists (to avoid duplicates)
                if (!existingFeatures.some(f => f.id === newFeature.id)) {
                  console.log('[Realtime] Adding new feature to module');
                  newMap.set(newRecord.module_id, [...existingFeatures, newFeature]);
                } else {
                  console.log('[Realtime] Feature already exists, skipping');
                }
              } else {
                console.log('[Realtime] Module not expanded, skipping update');
              }
              return newMap;
            });
          }

          if (eventType === 'UPDATE' && newRecord) {
            setModuleFeatures(prev => {
              const newMap = new Map(prev);
              const features = newMap.get(newRecord.module_id);
              if (features) {
                const featureIndex = features.findIndex(f => f.id === newRecord.id);
                if (featureIndex !== -1) {
                  const updatedFeatures = [...features];
                  updatedFeatures[featureIndex] = {
                    ...updatedFeatures[featureIndex],
                    name: newRecord.name,
                    phase: newRecord.phase,
                    sort_order: newRecord.sort_order,
                    code: newRecord.code,
                    updated_at: newRecord.updated_at
                  };
                  newMap.set(newRecord.module_id, updatedFeatures);
                }
              }
              return newMap;
            });
          }

          if (eventType === 'DELETE' && oldRecord) {
            setModuleFeatures(prev => {
              const newMap = new Map(prev);
              const features = newMap.get(oldRecord.module_id);
              if (features) {
                newMap.set(oldRecord.module_id, features.filter(f => f.id !== oldRecord.id));
              }
              return newMap;
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Features channel status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Supabase Realtime subscription for instant module updates
  useEffect(() => {
    const channel = supabase
      .channel('modules-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_modules', filter: `project_id=eq.${projectId}` },
        async (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          if (eventType === 'INSERT' && newRecord) {
            // Fetch the creator info for the new module
            let creatorInfo = null;
            if (newRecord.created_by) {
              try {
                const res = await fetch(`/api/users/${newRecord.created_by}`);
                if (res.ok) {
                  const data = await res.json();
                  creatorInfo = { id: data.user.id, full_name: data.user.full_name };
                }
              } catch (e) {
                console.error('Error fetching creator info:', e);
              }
            }

            const newModule: Module = {
              id: newRecord.id,
              name: newRecord.name,
              description: newRecord.description,
              priority: newRecord.priority || 'medium',
              status: newRecord.status || 'planned',
              eta: newRecord.eta,
              stakeholders: newRecord.stakeholders || [],
              phase: newRecord.phase || 1,
              code: newRecord.code,
              created_at: newRecord.created_at,
              updated_at: newRecord.updated_at,
              created_by_user: creatorInfo || undefined
            };

            setModules(prev => {
              // Check if module already exists (to avoid duplicates)
              if (prev.some(m => m.id === newModule.id)) return prev;
              return [...prev, newModule];
            });
          }

          if (eventType === 'UPDATE' && newRecord) {
            setModules(prev => prev.map(m =>
              m.id === newRecord.id
                ? {
                    ...m,
                    name: newRecord.name,
                    description: newRecord.description,
                    priority: newRecord.priority,
                    status: newRecord.status,
                    eta: newRecord.eta,
                    stakeholders: newRecord.stakeholders || [],
                    phase: newRecord.phase,
                    code: newRecord.code,
                    updated_at: newRecord.updated_at
                  }
                : m
            ));
          }

          if (eventType === 'DELETE' && oldRecord) {
            setModules(prev => prev.filter(m => m.id !== oldRecord.id));
            // Also remove features for deleted module
            setModuleFeatures(prev => {
              const newMap = new Map(prev);
              newMap.delete(oldRecord.id);
              return newMap;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

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

  const fetchProjectStakeholders = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProjectStakeholders(data.project.stakeholders || []);
      }
    } catch (error) {
      console.error('Error fetching stakeholders:', error);
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

  const fetchConnections = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/connections`);
      if (response.ok) {
        const data = await response.json();
        setConnections(data.connections || []);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };

  // Get connections for an entity
  const getConnectionsFor = (type: 'module' | 'function', id: string) => {
    return connections.filter(
      c => (c.source_type === type && c.source_id === id) ||
           (c.target_type === type && c.target_id === id)
    );
  };

  // Get connection count for an entity
  const getConnectionCount = (type: 'module' | 'function', id: string) => {
    return getConnectionsFor(type, id).length;
  };

  // Open connection modal
  const openConnectionModal = async (type: 'module' | 'function', id: string, name: string, code: string) => {
    // First, fetch features for ALL modules that haven't been loaded yet
    // This ensures all functions appear in the connection modal
    const modulesNeedingFeatures = modules.filter(m => !moduleFeatures.has(m.id));
    if (modulesNeedingFeatures.length > 0) {
      const featurePromises = modulesNeedingFeatures.map(async (m) => {
        try {
          const response = await fetch(`/api/projects/${projectId}/modules/${m.id}/features`);
          if (response.ok) {
            const data = await response.json();
            return { moduleId: m.id, features: data.features || [] };
          }
        } catch (error) {
          console.error('Error fetching features for module:', m.id, error);
        }
        return { moduleId: m.id, features: [] };
      });

      const results = await Promise.all(featurePromises);
      setModuleFeatures(prev => {
        const newMap = new Map(prev);
        results.forEach(r => newMap.set(r.moduleId, r.features));
        return newMap;
      });
    }

    setShowConnectionModal({ type, id, name, code });
    // Pre-select existing connections
    const existingConnections = getConnectionsFor(type, id).map(c => {
      if (c.source_type === type && c.source_id === id) {
        return { target_type: c.target_type, target_id: c.target_id };
      } else {
        return { target_type: c.source_type, target_id: c.source_id };
      }
    });
    setSelectedConnections(existingConnections);
  };

  // Save connections
  const saveConnections = async () => {
    if (!showConnectionModal) return;
    setSavingConnections(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/connections`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: showConnectionModal.type,
          source_id: showConnectionModal.id,
          connections: selectedConnections
        })
      });

      if (response.ok) {
        await fetchConnections();
        setShowConnectionModal(null);
        setSelectedConnections([]);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save connections');
      }
    } catch (error) {
      console.error('Error saving connections:', error);
      alert('Failed to save connections');
    } finally {
      setSavingConnections(false);
    }
  };

  // Toggle connection selection
  const toggleConnection = (targetType: 'module' | 'function', targetId: string) => {
    setSelectedConnections(prev => {
      const exists = prev.some(c => c.target_type === targetType && c.target_id === targetId);
      if (exists) {
        return prev.filter(c => !(c.target_type === targetType && c.target_id === targetId));
      } else {
        return [...prev, { target_type: targetType, target_id: targetId }];
      }
    });
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

  // Fetch features for a module (from new module_features table)
  const fetchFeaturesForModule = async (moduleId: string) => {
    if (loadingFeatures.has(moduleId)) return;

    setLoadingFeatures(prev => new Set(prev).add(moduleId));
    try {
      const response = await fetch(`/api/projects/${projectId}/modules/${moduleId}/features`);
      if (response.ok) {
        const data = await response.json();
        setModuleFeatures(prev => new Map(prev).set(moduleId, data.features || []));
      }
    } catch (error) {
      console.error('Error fetching features:', error);
    } finally {
      setLoadingFeatures(prev => {
        const newSet = new Set(prev);
        newSet.delete(moduleId);
        return newSet;
      });
    }
  };

  // Add a new feature using the new API
  const addFeatureNew = async (moduleId: string, name: string) => {
    if (!name.trim()) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/modules/${moduleId}/features`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });
      if (response.ok) {
        const data = await response.json();
        setModuleFeatures(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(moduleId) || [];
          newMap.set(moduleId, [...existing, data.feature]);
          return newMap;
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add feature');
      }
    } catch (error) {
      console.error('Error adding feature:', error);
      alert('Failed to add feature');
    }
  };

  // Update a feature using the new API
  const updateFeatureNew = async (featureId: string, moduleId: string, name: string, phase?: number) => {
    if (!name.trim()) return;

    try {
      const body: any = { name: name.trim() };
      if (phase !== undefined) body.phase = phase;

      const response = await fetch(`/api/projects/${projectId}/modules/${moduleId}/features/${featureId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (response.ok) {
        const data = await response.json();
        setModuleFeatures(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(moduleId) || [];
          newMap.set(moduleId, existing.map(f => f.id === featureId ? data.feature : f));
          return newMap;
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update feature');
      }
    } catch (error) {
      console.error('Error updating feature:', error);
    }
  };

  // Update feature phase
  const updateFeaturePhase = async (featureId: string, moduleId: string, phase: number) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/modules/${moduleId}/features/${featureId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase })
      });
      if (response.ok) {
        const data = await response.json();
        setModuleFeatures(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(moduleId) || [];
          newMap.set(moduleId, existing.map(f => f.id === featureId ? data.feature : f));
          return newMap;
        });
      }
    } catch (error) {
      console.error('Error updating phase:', error);
    }
  };

  // Update module phase
  const updateModulePhase = async (moduleId: string, phase: number) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/modules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_id: moduleId, phase })
      });
      if (response.ok) {
        const data = await response.json();
        setModules(prev => prev.map(m => m.id === moduleId ? data.module : m));
      }
    } catch (error) {
      console.error('Error updating module phase:', error);
    }
  };

  // Reorder features after drag and drop
  const reorderFeatures = async (moduleId: string, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const features = moduleFeatures.get(moduleId) || [];
    const newFeatures = [...features];
    const [moved] = newFeatures.splice(fromIndex, 1);
    newFeatures.splice(toIndex, 0, moved);

    // Update sort_order for all features
    const updatedFeatures = newFeatures.map((f, idx) => ({ ...f, sort_order: idx }));

    // Optimistically update UI
    setModuleFeatures(prev => {
      const newMap = new Map(prev);
      newMap.set(moduleId, updatedFeatures);
      return newMap;
    });

    // Send to server
    try {
      await fetch(`/api/projects/${projectId}/modules/${moduleId}/features`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: updatedFeatures.map(f => ({ id: f.id, sort_order: f.sort_order })) })
      });
    } catch (error) {
      console.error('Error reordering:', error);
      // Revert on error
      setModuleFeatures(prev => {
        const newMap = new Map(prev);
        newMap.set(moduleId, features);
        return newMap;
      });
    }
  };

  // Reorder modules after drag and drop
  const reorderModules = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const newModules = [...modules];
    const [moved] = newModules.splice(fromIndex, 1);
    newModules.splice(toIndex, 0, moved);

    // Optimistically update UI
    setModules(newModules);

    // Send to server
    try {
      await fetch(`/api/projects/${projectId}/modules`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules: newModules.map((m, idx) => ({ id: m.id, sort_order: idx })) })
      });
    } catch (error) {
      console.error('Error reordering modules:', error);
      setModules(modules); // Revert on error
    }
  };

  // Delete a feature using the new API
  const deleteFeatureNew = async (featureId: string, moduleId: string) => {
    if (!confirm('Delete this feature and all its remarks?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/modules/${moduleId}/features/${featureId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setModuleFeatures(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(moduleId) || [];
          newMap.set(moduleId, existing.filter(f => f.id !== featureId));
          return newMap;
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete feature');
      }
    } catch (error) {
      console.error('Error deleting feature:', error);
    }
  };

  // Add a remark to a feature
  const addRemark = async (featureId: string, moduleId: string) => {
    if (!newRemarkContent.trim() && !newRemarkImage && !newRemarkVoice) {
      alert('Please add some content or upload a file');
      return;
    }

    setSavingRemark(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/modules/${moduleId}/features/${featureId}/remarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newRemarkContent.trim() || null,
          image_url: newRemarkImage || null,
          voice_url: newRemarkVoice || null
        })
      });
      if (response.ok) {
        const data = await response.json();
        // Update the feature's remarks
        setModuleFeatures(prev => {
          const newMap = new Map(prev);
          const features = newMap.get(moduleId) || [];
          newMap.set(moduleId, features.map(f =>
            f.id === featureId
              ? { ...f, remarks: [...(f.remarks || []), data.remark] }
              : f
          ));
          return newMap;
        });
        // Reset form
        setAddingRemarkToFeature(null);
        setNewRemarkContent('');
        setNewRemarkImage(null);
        setNewRemarkVoice(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add remark');
      }
    } catch (error) {
      console.error('Error adding remark:', error);
      alert('Failed to add remark');
    } finally {
      setSavingRemark(false);
    }
  };

  // Update a remark
  const updateRemark = async (remarkId: string, featureId: string, moduleId: string) => {
    if (!editingRemark) return;
    if (!editingRemark.content?.trim() && !editingRemark.imageUrl && !editingRemark.voiceUrl) {
      alert('Please add some content or upload a file');
      return;
    }

    setSavingRemark(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/modules/${moduleId}/features/${featureId}/remarks/${remarkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editingRemark.content?.trim() || null,
          image_url: editingRemark.imageUrl || null,
          voice_url: editingRemark.voiceUrl || null
        })
      });
      if (response.ok) {
        const data = await response.json();
        // Update the feature's remarks
        setModuleFeatures(prev => {
          const newMap = new Map(prev);
          const features = newMap.get(moduleId) || [];
          newMap.set(moduleId, features.map(f =>
            f.id === featureId
              ? { ...f, remarks: (f.remarks || []).map(r => r.id === remarkId ? data.remark : r) }
              : f
          ));
          return newMap;
        });
        setEditingRemark(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update remark');
      }
    } catch (error) {
      console.error('Error updating remark:', error);
      alert('Failed to update remark');
    } finally {
      setSavingRemark(false);
    }
  };

  // Delete a remark
  const deleteRemark = async (remarkId: string, featureId: string, moduleId: string) => {
    if (!confirm('Delete this remark?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/modules/${moduleId}/features/${featureId}/remarks/${remarkId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        // Remove the remark from state
        setModuleFeatures(prev => {
          const newMap = new Map(prev);
          const features = newMap.get(moduleId) || [];
          newMap.set(moduleId, features.map(f =>
            f.id === featureId
              ? { ...f, remarks: (f.remarks || []).filter(r => r.id !== remarkId) }
              : f
          ));
          return newMap;
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete remark');
      }
    } catch (error) {
      console.error('Error deleting remark:', error);
    }
  };

  // Thread/Reply functions
  const toggleThread = async (remarkId: string) => {
    const isExpanded = expandedThreads.has(remarkId);

    if (isExpanded) {
      // Collapse thread
      setExpandedThreads(prev => {
        const newSet = new Set(prev);
        newSet.delete(remarkId);
        return newSet;
      });
    } else {
      // Expand thread and fetch replies if not already loaded
      setExpandedThreads(prev => new Set(prev).add(remarkId));

      if (!remarkReplies.has(remarkId)) {
        await fetchReplies(remarkId);
      }
    }
  };

  const fetchReplies = async (remarkId: string) => {
    setLoadingReplies(prev => new Set(prev).add(remarkId));
    try {
      const response = await fetch(`/api/remarks/${remarkId}/replies`);
      if (response.ok) {
        const data = await response.json();
        setRemarkReplies(prev => new Map(prev).set(remarkId, data.replies || []));
        setReplyCounts(prev => new Map(prev).set(remarkId, (data.replies || []).length));
      }
    } catch (error) {
      console.error('Error fetching replies:', error);
    } finally {
      setLoadingReplies(prev => {
        const newSet = new Set(prev);
        newSet.delete(remarkId);
        return newSet;
      });
    }
  };

  const addReply = async (remarkId: string) => {
    if (!newReplyContent.trim() && !newReplyImage && !newReplyVoice) return;

    setSavingReply(true);
    try {
      const response = await fetch(`/api/remarks/${remarkId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newReplyContent.trim() || null,
          image_url: newReplyImage,
          voice_url: newReplyVoice
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Add to local state
        setRemarkReplies(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(remarkId) || [];
          newMap.set(remarkId, [...existing, data.reply]);
          return newMap;
        });
        setReplyCounts(prev => new Map(prev).set(remarkId, (prev.get(remarkId) || 0) + 1));
        // Reset form
        setReplyingToRemark(null);
        setNewReplyContent('');
        setNewReplyImage(null);
        setNewReplyVoice(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add reply');
      }
    } catch (error) {
      console.error('Error adding reply:', error);
    } finally {
      setSavingReply(false);
    }
  };

  const deleteReply = async (remarkId: string, replyId: string) => {
    if (!confirm('Delete this reply?')) return;

    try {
      const response = await fetch(`/api/remarks/${remarkId}/replies/${replyId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setRemarkReplies(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(remarkId) || [];
          newMap.set(remarkId, existing.filter(r => r.id !== replyId));
          return newMap;
        });
        setReplyCounts(prev => new Map(prev).set(remarkId, Math.max(0, (prev.get(remarkId) || 0) - 1)));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete reply');
      }
    } catch (error) {
      console.error('Error deleting reply:', error);
    }
  };

  // Handle file upload for reply
  const handleReplyFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadRemarkFile(file, 'image');
    if (url) {
      setNewReplyImage(url);
    }
  };

  // Voice recording for reply
  const startReplyRecording = async () => {
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

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        const url = await uploadRemarkFile(audioFile, 'voice');
        if (url) {
          setNewReplyVoice(url);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingFor('inline');
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone');
    }
  };

  const stopReplyRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingFor(null);
    }
  };

  // Upload file for remark (image or voice)
  const uploadRemarkFile = async (file: File, type: 'image' | 'voice') => {
    setUploadingFile(true);
    try {
      // Get signed URL
      const signedUrlRes = await fetch('/api/upload/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type
        })
      });

      if (!signedUrlRes.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { signedUrl, token, publicUrl } = await signedUrlRes.json();

      // Upload directly to Supabase
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
          'x-upsert': 'true'
        },
        body: file
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file');
      }

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  // Handle file selection for new remark (image only - voice uses recording)
  const handleNewRemarkFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadRemarkFile(file, 'image');
    if (url) {
      setNewRemarkImage(url);
    }
  };

  // Handle file selection for editing remark (image only - voice uses recording)
  const handleEditRemarkFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadRemarkFile(file, 'image');
    if (url && editingRemark) {
      setEditingRemark({ ...editingRemark, imageUrl: url });
    }
  };

  // Voice recording functions
  const startVoiceRecording = async (target: 'modal' | 'inline' | 'newRemark' | 'editRemark') => {
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

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });

        // Upload the recorded audio
        const url = await uploadRemarkFile(file, 'voice');
        if (url) {
          if (target === 'modal') {
            setModalRemarkVoice(url);
          } else if (target === 'newRemark') {
            setNewRemarkVoice(url);
          } else if (target === 'editRemark' && editingRemark) {
            setEditingRemark({ ...editingRemark, voiceUrl: url });
          }
        }

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        setRecordingFor(null);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingFor(target === 'modal' ? 'modal' : 'inline');
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please allow microphone access.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  // Handle file selection for modal remarks
  const handleModalRemarkFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadRemarkFile(file, 'image');
    if (url) {
      setModalRemarkImage(url);
    }
  };

  // Add a remark to a feature in the modal (before saving)
  const addModalRemark = (featureIndex: number) => {
    if (!modalRemarkContent.trim() && !modalRemarkImage && !modalRemarkVoice) {
      alert('Please add content or a file');
      return;
    }

    const newRemark: ModalRemark = {
      content: modalRemarkContent.trim(),
      image_url: modalRemarkImage || null,
      voice_url: modalRemarkVoice || null
    };

    setModalFeatureRemarks(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(featureIndex) || [];
      newMap.set(featureIndex, [...existing, newRemark]);
      return newMap;
    });

    setAddingModalRemark(null);
    setModalRemarkContent('');
    setModalRemarkImage(null);
    setModalRemarkVoice(null);
  };

  // Remove a remark from a feature in the modal
  const removeModalRemark = (featureIndex: number, remarkIndex: number) => {
    setModalFeatureRemarks(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(featureIndex) || [];
      newMap.set(featureIndex, existing.filter((_, i) => i !== remarkIndex));
      return newMap;
    });
  };

  const canManageModules = () => {
    if (!currentUser) return false;
    return currentUser.is_admin ||
           currentUser.role === 'project_manager' ||
           currentUser.role === 'cto' ||
           currentUser.role === 'consultant';
  };

  // Check if current user is the master admin (only they can delete)
  const isMasterAdmin = () => {
    return currentUser?.id === MASTER_ADMIN_ID;
  };

  const toggleExpanded = (moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
        // Fetch features when expanding
        if (!moduleFeatures.has(moduleId)) {
          fetchFeaturesForModule(moduleId);
        }
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
      stakeholders: [] as string[],
      phase: 1
    });
    setFeaturesList(['']);
    setModalFeatureRemarks(new Map());
    setAddingModalRemark(null);
    setModalRemarkContent('');
    setModalRemarkImage(null);
    setModalRemarkVoice(null);
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
      stakeholders: module.stakeholders || [],
      phase: module.phase || 1
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
      // Convert featuresList to newline-separated description (for backward compatibility)
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
          stakeholders: formData.stakeholders,
          phase: formData.phase
        })
      });

      if (response.ok) {
        const data = await response.json();
        const newModule = data.module;
        setModules(prev => [...prev, newModule]);

        // Also create features in the new module_features table
        const featuresToCreate = featuresList.map((f, idx) => ({ name: f.trim(), originalIndex: idx })).filter(f => f.name);
        const createdFeatures: ModuleFeature[] = [];

        for (const { name: featureName, originalIndex } of featuresToCreate) {
          try {
            const featureRes = await fetch(`/api/projects/${projectId}/modules/${newModule.id}/features`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: featureName })
            });
            if (featureRes.ok) {
              const featureData = await featureRes.json();
              const createdFeature = featureData.feature;

              // Create remarks for this feature if any were added in the modal
              const remarksForFeature = modalFeatureRemarks.get(originalIndex) || [];
              const createdRemarks: FeatureRemark[] = [];

              for (const remark of remarksForFeature) {
                try {
                  const remarkRes = await fetch(`/api/projects/${projectId}/modules/${newModule.id}/features/${createdFeature.id}/remarks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      content: remark.content || null,
                      image_url: remark.image_url || null,
                      voice_url: remark.voice_url || null
                    })
                  });
                  if (remarkRes.ok) {
                    const remarkData = await remarkRes.json();
                    createdRemarks.push(remarkData.remark);
                  }
                } catch (err) {
                  console.error('Error creating remark:', err);
                }
              }

              createdFeatures.push({ ...createdFeature, remarks: createdRemarks });
            }
          } catch (err) {
            console.error('Error creating feature:', err);
          }
        }

        // Update moduleFeatures state with the new features
        if (createdFeatures.length > 0) {
          setModuleFeatures(prev => new Map(prev).set(newModule.id, createdFeatures));
        }

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
      // Convert featuresList to newline-separated description (for backward compatibility)
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
          stakeholders: formData.stakeholders,
          phase: formData.phase
        })
      });

      if (response.ok) {
        const data = await response.json();
        setModules(prev => prev.map(m => m.id === selectedModule.id ? data.module : m));

        // Sync features with module_features table
        const newFeatureNames = featuresList.filter(f => f.trim()).map(f => f.trim());
        const existingFeatures = moduleFeatures.get(selectedModule.id) || [];
        const existingFeatureNames = existingFeatures.map(f => f.name);

        // Find features to add (in newFeatureNames but not in existingFeatureNames)
        const featuresToAdd = newFeatureNames.filter(name => !existingFeatureNames.includes(name));

        // Add new features
        const addedFeatures: ModuleFeature[] = [];
        for (const featureName of featuresToAdd) {
          try {
            const featureRes = await fetch(`/api/projects/${projectId}/modules/${selectedModule.id}/features`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: featureName })
            });
            if (featureRes.ok) {
              const featureData = await featureRes.json();
              addedFeatures.push(featureData.feature);
            }
          } catch (err) {
            console.error('Error creating feature:', err);
          }
        }

        // Update moduleFeatures state
        if (addedFeatures.length > 0) {
          setModuleFeatures(prev => {
            const newMap = new Map(prev);
            const existing = newMap.get(selectedModule.id) || [];
            newMap.set(selectedModule.id, [...existing, ...addedFeatures]);
            return newMap;
          });
        }

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

  // Show access denied if user doesn't have permission
  if (!accessLoading && !hasAccess) {
    return (
      <DashboardLayout>
        <AccessDenied moduleName="modules" projectId={projectId} />
      </DashboardLayout>
    );
  }

  if (loading || accessLoading) {
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard/project/${projectId}/flow`)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
          >
            <i className="fas fa-project-diagram"></i>
            View Flow
          </button>
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
          onClick={() => router.push(`/dashboard/project/${projectId}/flow`)}
          className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 whitespace-nowrap"
        >
          Flow
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
          modules.map((module, moduleIdx) => {
            const isExpanded = expandedModules.has(module.id);
            const descriptionLines = module.description
              ? module.description.split('\n').filter(line => line.trim())
              : [];

            return (
              <div
                key={module.id}
                className={`border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm ${draggedModule === moduleIdx ? 'opacity-50' : ''}`}
                draggable={canManageModules()}
                onDragStart={() => setDraggedModule(moduleIdx)}
                onDragEnd={() => setDraggedModule(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedModule !== null && draggedModule !== moduleIdx) {
                    reorderModules(draggedModule, moduleIdx);
                  }
                  setDraggedModule(null);
                }}
              >
                {/* Collapsed Header - Click anywhere to expand/collapse */}
                <div
                  onClick={() => toggleExpanded(module.id)}
                  className={`w-full px-4 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left cursor-pointer ${
                    isExpanded ? 'bg-gray-50 dark:bg-gray-700/50' : ''
                  }`}
                >
                  {/* Drag Handle */}
                  {canManageModules() && (
                    <div
                      className="cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title="Drag to reorder"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <i className="fas fa-grip-vertical"></i>
                    </div>
                  )}
                  {/* Expand/Collapse Icon */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400"
                  >
                    <i className={`fas ${isExpanded ? 'fa-minus' : 'fa-plus'} text-sm`}></i>
                  </div>

                  {/* Module Name */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {module.code && (
                        <span className="text-indigo-600 dark:text-indigo-400 mr-2">{module.code}</span>
                      )}
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
                    {/* Phase Badge/Selector */}
                    <select
                      value={module.phase || 1}
                      onChange={(e) => { e.stopPropagation(); updateModulePhase(module.id, parseInt(e.target.value)); }}
                      onClick={(e) => e.stopPropagation()}
                      className={`text-xs px-2 py-0.5 rounded font-medium border-0 cursor-pointer ${
                        module.phase === 1 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                        module.phase === 2 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        module.phase === 3 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}
                      disabled={!canManageModules()}
                    >
                      <option value={1}>Ph 1</option>
                      <option value={2}>Ph 2</option>
                      <option value={3}>Ph 3</option>
                    </select>
                    {module.stakeholders && module.stakeholders.length > 0 && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                        <i className="fas fa-users mr-1"></i>
                        {module.stakeholders.length}
                      </span>
                    )}
                    {/* Connections indicator */}
                    {getConnectionCount('module', module.id) > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/project/${projectId}/flow?highlight=${module.id}`); }}
                        className="px-2 py-0.5 rounded text-xs font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-200 dark:hover:bg-cyan-800/40 transition-colors"
                        title="View connections in flow"
                      >
                        <i className="fas fa-project-diagram mr-1"></i>
                        {getConnectionCount('module', module.id)}
                      </button>
                    )}
                    {getStatusBadge(module.status)}
                    {getPriorityBadge(module.priority)}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
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

                    {/* Features List with Remarks */}
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Features / Functions:
                      </h4>

                      {/* Loading state */}
                      {loadingFeatures.has(module.id) && (
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 py-2">
                          <i className="fas fa-spinner animate-spin"></i>
                          <span className="text-sm">Loading features...</span>
                        </div>
                      )}

                      {/* Features from new API */}
                      {!loadingFeatures.has(module.id) && moduleFeatures.has(module.id) && (
                        <ol className="space-y-4">
                          {(moduleFeatures.get(module.id) || []).map((feature, idx) => {
                            const isEditingFeature = editingFeature?.moduleId === module.id && editingFeature?.index === idx;

                            return (
                              <li
                                key={feature.id}
                                className={`border-l-2 border-indigo-200 dark:border-indigo-700 pl-3 ${draggedFeature?.moduleId === module.id && draggedFeature?.index === idx ? 'opacity-50' : ''}`}
                                draggable={canManageModules()}
                                onDragStart={() => setDraggedFeature({ moduleId: module.id, index: idx })}
                                onDragEnd={() => setDraggedFeature(null)}
                                onDragOver={(e) => { e.preventDefault(); }}
                                onDrop={() => {
                                  if (draggedFeature && draggedFeature.moduleId === module.id) {
                                    reorderFeatures(module.id, draggedFeature.index, idx);
                                  }
                                  setDraggedFeature(null);
                                }}
                              >
                                {/* Feature Name */}
                                <div className="flex items-start gap-2 group">
                                  {canManageModules() && (
                                    <span className="cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mt-0.5" title="Drag to reorder">
                                      <i className="fas fa-grip-vertical text-xs"></i>
                                    </span>
                                  )}
                                  <span className="text-indigo-600 dark:text-indigo-400 font-medium min-w-[24px] text-sm">{idx + 1}.</span>
                                  {isEditingFeature ? (
                                    <div className="flex-1 flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={editingFeatureText}
                                        onChange={(e) => setEditingFeatureText(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            updateFeatureNew(feature.id, module.id, editingFeatureText);
                                            setEditingFeature(null);
                                            setEditingFeatureText('');
                                          }
                                          if (e.key === 'Escape') { setEditingFeature(null); setEditingFeatureText(''); }
                                        }}
                                        className="flex-1 px-2 py-1 text-sm border border-indigo-300 dark:border-indigo-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => {
                                          updateFeatureNew(feature.id, module.id, editingFeatureText);
                                          setEditingFeature(null);
                                          setEditingFeatureText('');
                                        }}
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
                                      <div className="flex items-center gap-2">
                                        {feature.code && (
                                          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{feature.code}</span>
                                        )}
                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{feature.name}</span>
                                        <select
                                          value={feature.phase || 1}
                                          onChange={(e) => { e.stopPropagation(); updateFeaturePhase(feature.id, module.id, parseInt(e.target.value)); }}
                                          onClick={(e) => e.stopPropagation()}
                                          className={`text-xs px-1.5 py-0.5 rounded-full font-medium border-0 cursor-pointer ${
                                            feature.phase === 1 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                            feature.phase === 2 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                          }`}
                                          disabled={!canManageModules()}
                                        >
                                          <option value={1}>Phase 1</option>
                                          <option value={2}>Phase 2</option>
                                          <option value={3}>Phase 3</option>
                                        </select>
                                        {/* Connection indicator for functions */}
                                        {getConnectionCount('function', feature.id) > 0 && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/project/${projectId}/flow?highlight=${feature.id}`); }}
                                            className="px-1.5 py-0.5 rounded text-xs font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-200 dark:hover:bg-cyan-800/40 transition-colors"
                                            title="View connections in flow"
                                          >
                                            <i className="fas fa-project-diagram text-[10px]"></i>
                                            <span className="ml-0.5">{getConnectionCount('function', feature.id)}</span>
                                          </button>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* Connect button */}
                                        {canManageModules() && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); openConnectionModal('function', feature.id, feature.name, feature.code || ''); }}
                                            className="p-1 text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded"
                                            title="Manage connections"
                                          >
                                            <i className="fas fa-link text-xs"></i>
                                          </button>
                                        )}
                                        {canManageModules() && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setEditingFeature({ moduleId: module.id, index: idx }); setEditingFeatureText(feature.name); }}
                                            className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded"
                                            title="Edit feature"
                                          >
                                            <i className="fas fa-pen text-xs"></i>
                                          </button>
                                        )}
                                        {isMasterAdmin() && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); deleteFeatureNew(feature.id, module.id); }}
                                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                            title="Delete feature"
                                          >
                                            <i className="fas fa-trash text-xs"></i>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Remarks */}
                                {feature.remarks && feature.remarks.length > 0 && (
                                  <ul className="mt-2 ml-6 space-y-2">
                                    {feature.remarks.map((remark) => (
                                      <li key={remark.id} className="group/remark">
                                        {editingRemark?.id === remark.id ? (
                                          // Edit remark form
                                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-2">
                                            <textarea
                                              value={editingRemark.content || ''}
                                              onChange={(e) => setEditingRemark({ ...editingRemark, content: e.target.value })}
                                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                              rows={2}
                                              placeholder="Remark content (supports links)..."
                                            />
                                            {(editingRemark.imageUrl || editingRemark.voiceUrl) && (
                                              <div className="flex flex-wrap items-center gap-3">
                                                {editingRemark.imageUrl && (
                                                  <div className="flex items-center gap-2">
                                                    <img src={editingRemark.imageUrl} alt="Attachment" className="w-16 h-16 object-cover rounded" />
                                                    <button
                                                      onClick={() => setEditingRemark({ ...editingRemark, imageUrl: null })}
                                                      className="text-xs text-red-500 hover:text-red-700"
                                                    >
                                                      Remove
                                                    </button>
                                                  </div>
                                                )}
                                                {editingRemark.voiceUrl && (
                                                  <div className="flex items-center gap-2">
                                                    <audio src={editingRemark.voiceUrl} controls className="h-8" />
                                                    <button
                                                      onClick={() => setEditingRemark({ ...editingRemark, voiceUrl: null })}
                                                      className="text-xs text-red-500 hover:text-red-700"
                                                    >
                                                      Remove
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                              <label className="cursor-pointer p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded" title="Upload image">
                                                <i className="fas fa-image text-sm"></i>
                                                <input type="file" accept="image/*" className="hidden" onChange={handleEditRemarkFileSelect} />
                                              </label>
                                              <button
                                                type="button"
                                                onClick={() => isRecording ? stopVoiceRecording() : startVoiceRecording('editRemark')}
                                                className={`p-1.5 rounded transition-colors ${
                                                  isRecording && recordingFor === 'inline'
                                                    ? 'text-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse'
                                                    : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                                                }`}
                                                title={isRecording ? 'Stop recording' : 'Record voice note'}
                                              >
                                                <i className="fas fa-microphone text-sm"></i>
                                              </button>
                                              <div className="flex-1"></div>
                                              <button
                                                onClick={() => setEditingRemark(null)}
                                                className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                              >
                                                Cancel
                                              </button>
                                              <button
                                                onClick={() => updateRemark(remark.id, feature.id, module.id)}
                                                disabled={savingRemark}
                                                className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                                              >
                                                {savingRemark ? 'Saving...' : 'Save'}
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          // Display remark
                                          <div className="flex items-start gap-2">
                                            <span className="text-indigo-400 mt-1">&#8226;</span>
                                            <div className="flex-1">
                                              {remark.content && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">
                                                  {remark.content.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                                                    part.match(/^https?:\/\//) ? (
                                                      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                                                        {part}
                                                      </a>
                                                    ) : part
                                                  )}
                                                </p>
                                              )}
                                              {remark.image_url && (
                                                <a href={remark.image_url} target="_blank" rel="noopener noreferrer">
                                                  <img src={remark.image_url} alt="Attachment" className="mt-1 max-w-xs max-h-32 object-cover rounded border border-gray-200 dark:border-gray-600 hover:opacity-80 transition-opacity" />
                                                </a>
                                              )}
                                              {remark.voice_url && (
                                                <audio src={remark.voice_url} controls className="mt-1 h-8" />
                                              )}
                                              {remark.created_by_user && (
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                  — {remark.created_by_user.full_name}
                                                </p>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover/remark:opacity-100 transition-opacity">
                                              {/* Reply button */}
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (!expandedThreads.has(remark.id)) {
                                                    toggleThread(remark.id);
                                                  }
                                                  setReplyingToRemark(remark.id);
                                                }}
                                                className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded"
                                                title="Reply to remark"
                                              >
                                                <i className="fas fa-reply text-xs"></i>
                                              </button>
                                              {canManageModules() && (
                                                <>
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setEditingRemark({
                                                        id: remark.id,
                                                        featureId: feature.id,
                                                        content: remark.content || '',
                                                        imageUrl: remark.image_url,
                                                        voiceUrl: remark.voice_url
                                                      });
                                                    }}
                                                    className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded"
                                                    title="Edit remark"
                                                  >
                                                    <i className="fas fa-pen text-xs"></i>
                                                  </button>
                                                  <button
                                                    onClick={(e) => { e.stopPropagation(); deleteRemark(remark.id, feature.id, module.id); }}
                                                    className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                    title="Delete remark"
                                                  >
                                                    <i className="fas fa-trash text-xs"></i>
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        {/* Thread toggle and replies */}
                                        <div className="ml-6 mt-1">
                                          {/* Thread toggle button */}
                                          <button
                                            onClick={(e) => { e.stopPropagation(); toggleThread(remark.id); }}
                                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                          >
                                            <i className={`fas ${expandedThreads.has(remark.id) ? 'fa-minus' : 'fa-plus'} text-[10px]`}></i>
                                            <span>
                                              {replyCounts.get(remark.id) || 0} {(replyCounts.get(remark.id) || 0) === 1 ? 'reply' : 'replies'}
                                            </span>
                                          </button>

                                          {/* Expanded thread section */}
                                          {expandedThreads.has(remark.id) && (
                                            <div className="mt-2 pl-3 border-l-2 border-gray-200 dark:border-gray-600 space-y-2">
                                              {/* Loading indicator */}
                                              {loadingReplies.has(remark.id) && (
                                                <div className="text-xs text-gray-400 flex items-center gap-1">
                                                  <i className="fas fa-spinner animate-spin"></i>
                                                  Loading replies...
                                                </div>
                                              )}

                                              {/* Replies list */}
                                              {(remarkReplies.get(remark.id) || []).map((reply) => (
                                                <div key={reply.id} className="group/reply bg-gray-50 dark:bg-gray-700/30 rounded p-2">
                                                  <div className="flex items-start gap-2">
                                                    <i className="fas fa-reply text-gray-300 dark:text-gray-600 text-xs mt-1 rotate-180"></i>
                                                    <div className="flex-1 min-w-0">
                                                      {reply.content && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">
                                                          {reply.content.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                                                            part.match(/^https?:\/\//) ? (
                                                              <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                                                                {part}
                                                              </a>
                                                            ) : part
                                                          )}
                                                        </p>
                                                      )}
                                                      {reply.image_url && (
                                                        <a href={reply.image_url} target="_blank" rel="noopener noreferrer">
                                                          <img src={reply.image_url} alt="Attachment" className="mt-1 max-w-xs max-h-24 object-cover rounded border border-gray-200 dark:border-gray-600 hover:opacity-80 transition-opacity" />
                                                        </a>
                                                      )}
                                                      {reply.voice_url && (
                                                        <audio src={reply.voice_url} controls className="mt-1 h-8" />
                                                      )}
                                                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                        — {reply.created_by_user?.full_name || 'Unknown'} • {new Date(reply.created_at).toLocaleString()}
                                                      </p>
                                                    </div>
                                                    {(currentUser?.id === reply.created_by || currentUser?.id === MASTER_ADMIN_ID) && (
                                                      <button
                                                        onClick={(e) => { e.stopPropagation(); deleteReply(remark.id, reply.id); }}
                                                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover/reply:opacity-100 transition-opacity"
                                                        title="Delete reply"
                                                      >
                                                        <i className="fas fa-trash text-xs"></i>
                                                      </button>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}

                                              {/* Reply form */}
                                              {replyingToRemark === remark.id ? (
                                                <div className="bg-white dark:bg-gray-700 rounded p-2 space-y-2 border border-gray-200 dark:border-gray-600">
                                                  <textarea
                                                    value={newReplyContent}
                                                    onChange={(e) => setNewReplyContent(e.target.value)}
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    rows={2}
                                                    placeholder="Write a reply..."
                                                    autoFocus
                                                  />
                                                  {(newReplyImage || newReplyVoice) && (
                                                    <div className="flex flex-wrap items-center gap-3">
                                                      {newReplyImage && (
                                                        <div className="flex items-center gap-2">
                                                          <img src={newReplyImage} alt="Attachment" className="w-12 h-12 object-cover rounded" />
                                                          <button
                                                            onClick={() => setNewReplyImage(null)}
                                                            className="text-xs text-red-500 hover:text-red-700"
                                                          >
                                                            Remove
                                                          </button>
                                                        </div>
                                                      )}
                                                      {newReplyVoice && (
                                                        <div className="flex items-center gap-2">
                                                          <audio src={newReplyVoice} controls className="h-8" />
                                                          <button
                                                            onClick={() => setNewReplyVoice(null)}
                                                            className="text-xs text-red-500 hover:text-red-700"
                                                          >
                                                            Remove
                                                          </button>
                                                        </div>
                                                      )}
                                                    </div>
                                                  )}
                                                  {uploadingFile && (
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                      <i className="fas fa-spinner animate-spin"></i>
                                                      <span>Uploading...</span>
                                                    </div>
                                                  )}
                                                  <div className="flex items-center gap-2">
                                                    <label className="cursor-pointer p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded" title="Upload image">
                                                      <i className="fas fa-image text-xs"></i>
                                                      <input type="file" accept="image/*" className="hidden" onChange={handleReplyFileSelect} disabled={uploadingFile} />
                                                    </label>
                                                    <button
                                                      type="button"
                                                      onClick={() => isRecording && recordingFor === 'inline' ? stopReplyRecording() : startReplyRecording()}
                                                      className={`p-1 rounded transition-colors ${
                                                        isRecording && recordingFor === 'inline'
                                                          ? 'text-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse'
                                                          : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                                                      }`}
                                                      title={isRecording ? 'Stop recording' : 'Record voice note'}
                                                    >
                                                      <i className="fas fa-microphone text-xs"></i>
                                                    </button>
                                                    <div className="flex-1"></div>
                                                    <button
                                                      onClick={() => {
                                                        setReplyingToRemark(null);
                                                        setNewReplyContent('');
                                                        setNewReplyImage(null);
                                                        setNewReplyVoice(null);
                                                      }}
                                                      className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                                    >
                                                      Cancel
                                                    </button>
                                                    <button
                                                      onClick={() => addReply(remark.id)}
                                                      disabled={savingReply || (!newReplyContent.trim() && !newReplyImage && !newReplyVoice)}
                                                      className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                                                    >
                                                      {savingReply ? 'Sending...' : 'Reply'}
                                                    </button>
                                                  </div>
                                                </div>
                                              ) : (
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); setReplyingToRemark(remark.id); }}
                                                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                                                >
                                                  + Add reply
                                                </button>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                )}

                                {/* Add Remark Form */}
                                {addingRemarkToFeature === feature.id ? (
                                  <div className="mt-2 ml-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-2">
                                    <textarea
                                      value={newRemarkContent}
                                      onChange={(e) => setNewRemarkContent(e.target.value)}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                      rows={2}
                                      placeholder="Add a remark (supports links)..."
                                      autoFocus
                                    />
                                    {(newRemarkImage || newRemarkVoice) && (
                                      <div className="flex flex-wrap items-center gap-3">
                                        {newRemarkImage && (
                                          <div className="flex items-center gap-2">
                                            <img src={newRemarkImage} alt="Attachment" className="w-16 h-16 object-cover rounded" />
                                            <button
                                              onClick={() => setNewRemarkImage(null)}
                                              className="text-xs text-red-500 hover:text-red-700"
                                            >
                                              Remove
                                            </button>
                                          </div>
                                        )}
                                        {newRemarkVoice && (
                                          <div className="flex items-center gap-2">
                                            <audio src={newRemarkVoice} controls className="h-8" />
                                            <button
                                              onClick={() => setNewRemarkVoice(null)}
                                              className="text-xs text-red-500 hover:text-red-700"
                                            >
                                              Remove
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {uploadingFile && (
                                      <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <i className="fas fa-spinner animate-spin"></i>
                                        <span>Uploading...</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <label className="cursor-pointer p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded" title="Upload image">
                                        <i className="fas fa-image text-sm"></i>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleNewRemarkFileSelect} disabled={uploadingFile} />
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => isRecording ? stopVoiceRecording() : startVoiceRecording('newRemark')}
                                        className={`p-1.5 rounded transition-colors ${
                                          isRecording && recordingFor === 'inline'
                                            ? 'text-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse'
                                            : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                                        }`}
                                        title={isRecording ? 'Stop recording' : 'Record voice note'}
                                        disabled={uploadingFile}
                                      >
                                        <i className="fas fa-microphone text-sm"></i>
                                      </button>
                                      <div className="flex-1"></div>
                                      <button
                                        onClick={() => { setAddingRemarkToFeature(null); setNewRemarkContent(''); setNewRemarkImage(null); setNewRemarkVoice(null); }}
                                        className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => addRemark(feature.id, module.id)}
                                        disabled={savingRemark || uploadingFile || (!newRemarkContent.trim() && !newRemarkImage && !newRemarkVoice)}
                                        className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                                      >
                                        {savingRemark ? 'Adding...' : 'Add Function'}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  canManageModules() && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setAddingRemarkToFeature(feature.id); }}
                                      className="mt-2 ml-6 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                    >
                                      <i className="fas fa-plus"></i>
                                      <span>Add Function</span>
                                    </button>
                                  )
                                )}
                              </li>
                            );
                          })}
                        </ol>
                      )}

                      {/* Fallback: Show old description-based features if new API hasn't loaded */}
                      {!loadingFeatures.has(module.id) && !moduleFeatures.has(module.id) && descriptionLines.length > 0 && (
                        <ol className="space-y-2 text-sm text-gray-500 dark:text-gray-400 italic">
                          {descriptionLines.map((line, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-indigo-400 font-medium min-w-[24px]">{idx + 1}.</span>
                              <span>{line.replace(/^[•\-\*\d\.]+\s*/, '')}</span>
                            </li>
                          ))}
                          <p className="text-xs text-gray-400 mt-2">
                            (Expand to load features with remarks)
                          </p>
                        </ol>
                      )}

                      {/* Add Feature */}
                      {canManageModules() && moduleFeatures.has(module.id) && (
                        <div className="mt-3">
                          {addingFeature === module.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-indigo-600 dark:text-indigo-400 font-medium min-w-[24px] text-sm">{(moduleFeatures.get(module.id)?.length || 0) + 1}.</span>
                              <input
                                type="text"
                                value={newFeatureText}
                                onChange={(e) => setNewFeatureText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    addFeatureNew(module.id, newFeatureText);
                                    setAddingFeature(null);
                                    setNewFeatureText('');
                                  }
                                  if (e.key === 'Escape') { setAddingFeature(null); setNewFeatureText(''); }
                                }}
                                placeholder="Type feature and press Enter..."
                                className="flex-1 px-2 py-1 text-sm border border-indigo-300 dark:border-indigo-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                autoFocus
                              />
                              <button
                                onClick={() => {
                                  addFeatureNew(module.id, newFeatureText);
                                  setAddingFeature(null);
                                  setNewFeatureText('');
                                }}
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
                        {isMasterAdmin() && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteModule(module.id); }}
                            className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <i className="fas fa-trash mr-1"></i> Delete
                          </button>
                        )}
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
                <div className="space-y-4">
                  {featuresList.map((feature, idx) => (
                    <div key={idx} className="border-l-2 border-indigo-200 dark:border-indigo-700 pl-3">
                      {/* Feature input row */}
                      <div className="flex items-center gap-2">
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
                          title={listeningIndex === idx ? 'Stop listening' : 'Voice input for feature name'}
                        >
                          <i className={`fas fa-microphone ${listeningIndex === idx ? 'text-red-500' : ''}`}></i>
                        </button>
                        {featuresList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setFeaturesList(featuresList.filter((_, i) => i !== idx));
                              // Also remove remarks for this feature
                              setModalFeatureRemarks(prev => {
                                const newMap = new Map();
                                prev.forEach((remarks, key) => {
                                  if (key < idx) newMap.set(key, remarks);
                                  else if (key > idx) newMap.set(key - 1, remarks);
                                });
                                return newMap;
                              });
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          >
                            <i className="fas fa-times text-xs"></i>
                          </button>
                        )}
                      </div>

                      {/* Remarks for this feature */}
                      {feature.trim() && (
                        <div className="ml-8 mt-2">
                          {/* Existing remarks */}
                          {(modalFeatureRemarks.get(idx) || []).map((remark, remarkIdx) => (
                            <div key={remarkIdx} className="flex items-start gap-2 mb-2 group">
                              <span className="text-indigo-400 mt-1">&#8226;</span>
                              <div className="flex-1">
                                {remark.content && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{remark.content}</p>
                                )}
                                {remark.image_url && (
                                  <img src={remark.image_url} alt="Attachment" className="mt-1 max-w-[100px] max-h-[60px] object-cover rounded border" />
                                )}
                                {remark.voice_url && (
                                  <audio src={remark.voice_url} controls className="mt-1 h-8" />
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeModalRemark(idx, remarkIdx)}
                                className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <i className="fas fa-times text-xs"></i>
                              </button>
                            </div>
                          ))}

                          {/* Add remark form */}
                          {addingModalRemark === idx ? (
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 space-y-2">
                              <textarea
                                value={modalRemarkContent}
                                onChange={(e) => setModalRemarkContent(e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                rows={2}
                                placeholder="Add a remark (supports links)..."
                                autoFocus
                              />
                              {(modalRemarkImage || modalRemarkVoice) && (
                                <div className="flex flex-wrap items-center gap-3">
                                  {modalRemarkImage && (
                                    <div className="flex items-center gap-2">
                                      <img src={modalRemarkImage} alt="Attachment" className="w-12 h-12 object-cover rounded" />
                                      <button type="button" onClick={() => setModalRemarkImage(null)} className="text-xs text-red-500">Remove</button>
                                    </div>
                                  )}
                                  {modalRemarkVoice && (
                                    <div className="flex items-center gap-2">
                                      <audio src={modalRemarkVoice} controls className="h-8" />
                                      <button type="button" onClick={() => setModalRemarkVoice(null)} className="text-xs text-red-500">Remove</button>
                                    </div>
                                  )}
                                </div>
                              )}
                              {uploadingFile && (
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <i className="fas fa-spinner animate-spin"></i>
                                  <span>Uploading...</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <label className="cursor-pointer p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded" title="Upload image">
                                  <i className="fas fa-image text-sm"></i>
                                  <input type="file" accept="image/*" className="hidden" onChange={handleModalRemarkFileSelect} disabled={uploadingFile} />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => isRecording ? stopVoiceRecording() : startVoiceRecording('modal')}
                                  className={`p-1.5 rounded transition-colors ${
                                    isRecording && recordingFor === 'modal'
                                      ? 'text-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse'
                                      : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                                  }`}
                                  title={isRecording ? 'Stop recording' : 'Record voice note'}
                                  disabled={uploadingFile}
                                >
                                  <i className="fas fa-microphone text-sm"></i>
                                </button>
                                <div className="flex-1"></div>
                                <button
                                  type="button"
                                  onClick={() => { setAddingModalRemark(null); setModalRemarkContent(''); setModalRemarkImage(null); setModalRemarkVoice(null); }}
                                  className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addModalRemark(idx)}
                                  disabled={uploadingFile || (!modalRemarkContent.trim() && !modalRemarkImage && !modalRemarkVoice)}
                                  className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAddingModalRemark(idx)}
                              className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                            >
                              <i className="fas fa-plus"></i>
                              <span>Add Function</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setFeaturesList([...featuresList, ''])}
                  className="mt-3 flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
                >
                  <i className="fas fa-plus text-xs"></i>
                  <span>Add Feature</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phase
                  </label>
                  <select
                    value={formData.phase}
                    onChange={(e) => setFormData({ ...formData, phase: parseInt(e.target.value) })}
                    className="input-field"
                  >
                    <option value={1}>Phase 1</option>
                    <option value={2}>Phase 2</option>
                    <option value={3}>Phase 3</option>
                  </select>
                </div>

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
                {projectStakeholders.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic py-2">
                    No stakeholders added. <a href={`/dashboard/project/${projectId}/stakeholders`} className="text-indigo-600 hover:underline">Add stakeholders</a>
                  </p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-xl p-3 bg-white dark:bg-gray-700">
                    {projectStakeholders.map((stakeholder, idx) => (
                      <label key={idx} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 p-2 rounded-lg">
                        <input
                          type="checkbox"
                          checked={formData.stakeholders.includes(stakeholder)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, stakeholders: [...formData.stakeholders, stakeholder] });
                            } else {
                              setFormData({ ...formData, stakeholders: formData.stakeholders.filter((s) => s !== stakeholder) });
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                        <span className="text-gray-900 dark:text-white">{stakeholder}</span>
                      </label>
                    ))}
                  </div>
                )}
                {formData.stakeholders.length > 0 && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                    Selected: {formData.stakeholders.join(', ')}
                  </p>
                )}
                <a
                  href={`/dashboard/project/${projectId}/stakeholders`}
                  target="_blank"
                  className="text-xs text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 mt-2 inline-flex items-center gap-1"
                >
                  <i className="fas fa-plus-circle"></i>
                  Add a missing stakeholder
                </a>
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phase
                  </label>
                  <select
                    value={formData.phase}
                    onChange={(e) => setFormData({ ...formData, phase: parseInt(e.target.value) })}
                    className="input-field"
                  >
                    <option value={1}>Phase 1</option>
                    <option value={2}>Phase 2</option>
                    <option value={3}>Phase 3</option>
                  </select>
                </div>

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
                {projectStakeholders.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic py-2">
                    No stakeholders added. <a href={`/dashboard/project/${projectId}/stakeholders`} className="text-indigo-600 hover:underline">Add stakeholders</a>
                  </p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-xl p-3 bg-white dark:bg-gray-700">
                    {projectStakeholders.map((stakeholder, idx) => (
                      <label key={idx} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 p-2 rounded-lg">
                        <input
                          type="checkbox"
                          checked={formData.stakeholders.includes(stakeholder)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, stakeholders: [...formData.stakeholders, stakeholder] });
                            } else {
                              setFormData({ ...formData, stakeholders: formData.stakeholders.filter((s) => s !== stakeholder) });
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                        <span className="text-gray-900 dark:text-white">{stakeholder}</span>
                      </label>
                    ))}
                  </div>
                )}
                {formData.stakeholders.length > 0 && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                    Selected: {formData.stakeholders.join(', ')}
                  </p>
                )}
                <a
                  href={`/dashboard/project/${projectId}/stakeholders`}
                  target="_blank"
                  className="text-xs text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 mt-2 inline-flex items-center gap-1"
                >
                  <i className="fas fa-plus-circle"></i>
                  Add a missing stakeholder
                </a>
              </div>

              {/* Module Connections */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <i className="fas fa-project-diagram mr-1 text-cyan-500"></i>
                  Connect to Other Modules
                </label>
                <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                  {modules.filter(m => m.id !== selectedModule?.id).map((m) => {
                    const isConnected = connections.some(c =>
                      (c.source_type === 'module' && c.source_id === selectedModule?.id && c.target_type === 'module' && c.target_id === m.id) ||
                      (c.target_type === 'module' && c.target_id === selectedModule?.id && c.source_type === 'module' && c.source_id === m.id)
                    );
                    return (
                      <label key={m.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isConnected}
                          onChange={async () => {
                            if (!selectedModule) return;
                            if (isConnected) {
                              // Remove connection
                              await fetch(`/api/projects/${projectId}/connections?source_type=module&source_id=${selectedModule.id}&target_type=module&target_id=${m.id}`, {
                                method: 'DELETE'
                              });
                            } else {
                              // Add connection
                              await fetch(`/api/projects/${projectId}/connections`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  source_type: 'module',
                                  source_id: selectedModule.id,
                                  target_type: 'module',
                                  target_id: m.id
                                })
                              });
                            }
                            await fetchConnections();
                          }}
                          className="w-4 h-4 text-cyan-600 rounded border-gray-300 focus:ring-cyan-500"
                        />
                        <span className="text-cyan-600 dark:text-cyan-400 font-medium text-sm">{m.code || 'M?'}</span>
                        <span className="text-gray-900 dark:text-white text-sm">{m.name}</span>
                      </label>
                    );
                  })}
                  {modules.filter(m => m.id !== selectedModule?.id).length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic p-2">No other modules to connect to</p>
                  )}
                </div>
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

      {/* Connection Modal */}
      {showConnectionModal && (
        <div className="modal-overlay" onClick={() => { setShowConnectionModal(null); setSelectedConnections([]); }}>
          <div className="modal-content max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Connections for {showConnectionModal.code} - {showConnectionModal.name}
              </h2>
              <button onClick={() => { setShowConnectionModal(null); setSelectedConnections([]); }} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4">
              {/* Connect to Modules */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <i className="fas fa-cubes mr-2 text-indigo-500"></i>
                  Connect to Modules
                </h3>
                <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                  {modules.filter(m => !(showConnectionModal.type === 'module' && m.id === showConnectionModal.id)).map((m) => (
                    <label key={m.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedConnections.some(c => c.target_type === 'module' && c.target_id === m.id)}
                        onChange={() => toggleConnection('module', m.id)}
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      />
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium text-sm">{m.code || 'M?'}</span>
                      <span className="text-gray-900 dark:text-white text-sm">{m.name}</span>
                    </label>
                  ))}
                  {modules.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic p-2">No modules available</p>
                  )}
                </div>
              </div>

              {/* Connect to Functions - only if current entity is a function */}
              {showConnectionModal.type === 'function' && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <i className="fas fa-cogs mr-2 text-purple-500"></i>
                    Connect to Functions
                  </h3>
                  <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                    {Array.from(moduleFeatures.values()).flat().filter(f => f.id !== showConnectionModal.id).map((f) => (
                      <label key={f.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedConnections.some(c => c.target_type === 'function' && c.target_id === f.id)}
                          onChange={() => toggleConnection('function', f.id)}
                          className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                        />
                        <span className="text-purple-600 dark:text-purple-400 font-medium text-sm">{f.code || 'F?'}</span>
                        <span className="text-gray-900 dark:text-white text-sm truncate">{f.name}</span>
                      </label>
                    ))}
                    {Array.from(moduleFeatures.values()).flat().length <= 1 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic p-2">No other functions available</p>
                    )}
                  </div>
                </div>
              )}

              {/* Selected connections summary */}
              {selectedConnections.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Selected ({selectedConnections.length}):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedConnections.map((c, i) => {
                      const targetName = c.target_type === 'module'
                        ? modules.find(m => m.id === c.target_id)?.code || c.target_id
                        : Array.from(moduleFeatures.values()).flat().find(f => f.id === c.target_id)?.code || c.target_id;
                      return (
                        <span key={i} className={`px-2 py-0.5 rounded text-xs font-medium ${
                          c.target_type === 'module'
                            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                        }`}>
                          {targetName}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button
                onClick={() => { setShowConnectionModal(null); setSelectedConnections([]); }}
                className="btn-secondary flex-1"
                disabled={savingConnections}
              >
                Cancel
              </button>
              <button
                onClick={saveConnections}
                disabled={savingConnections}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {savingConnections ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-spinner animate-spin"></i> Saving...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-save"></i> Save Connections
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
