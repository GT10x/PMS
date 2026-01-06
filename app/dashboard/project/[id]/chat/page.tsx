'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Breadcrumb from '@/components/Breadcrumb';
import { ChatMessageSkeleton } from '@/components/LoadingSkeleton';
import { NoMessagesEmptyState } from '@/components/EmptyState';
import Tooltip from '@/components/Tooltip';

interface User {
  id: string;
  full_name: string;
  username?: string;
  role: string;
}

interface Reaction {
  id: string;
  emoji: string;
  user: { id: string; full_name: string };
}

interface Message {
  id: string;
  content: string;
  message_type: 'text' | 'image' | 'voice' | 'file';
  attachment_url?: string;
  created_at: string;
  sender: User;
  reply_to?: {
    id: string;
    content: string;
    sender: { id: string; full_name: string };
  };
  reactions: Reaction[];
  mentions: string[];
}

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏'];

export default function ProjectChatPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Input state
  const [messageText, setMessageText] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [voiceNote, setVoiceNote] = useState<Blob | null>(null);
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Image upload
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // UI refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);

  // Polling for new messages
  const lastMessageRef = useRef<string | null>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchMessages();
    markChatAsRead();

    // Poll for new messages every 3 seconds
    const pollInterval = setInterval(pollNewMessages, 3000);
    return () => clearInterval(pollInterval);
  }, []);

  const markChatAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, type: 'chat' })
      });
    } catch (error) {
      // Silent fail
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user || data);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/chat`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setMembers(data.members || []);
        if (data.messages?.length > 0) {
          lastMessageRef.current = data.messages[data.messages.length - 1].created_at;
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const pollNewMessages = async () => {
    if (!lastMessageRef.current) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/chat`);
      if (response.ok) {
        const data = await response.json();
        const newMessages = data.messages || [];

        if (newMessages.length > 0) {
          const latestTime = newMessages[newMessages.length - 1].created_at;
          if (latestTime !== lastMessageRef.current) {
            setMessages(newMessages);
            lastMessageRef.current = latestTime;
          }
        }
      }
    } catch (error) {
      // Silent fail for polling
    }
  };

  // Voice recording functions
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
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      alert('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const cancelVoiceNote = () => {
    if (voiceNoteUrl) URL.revokeObjectURL(voiceNoteUrl);
    setVoiceNote(null);
    setVoiceNoteUrl(null);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Image handling
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const cancelImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setSelectedImage(null);
    setImagePreview(null);
  };

  // Mention handling
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessageText(value);

    // Check for @ mentions
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const afterAt = value.slice(lastAtIndex + 1);
      const spaceIndex = afterAt.indexOf(' ');
      if (spaceIndex === -1) {
        setMentionSearch(afterAt.toLowerCase());
        setShowMentions(true);
        setMentionIndex(0);
        return;
      }
    }
    setShowMentions(false);
  };

  const filteredMembers = members.filter(m =>
    m.full_name.toLowerCase().includes(mentionSearch) ||
    m.username?.toLowerCase().includes(mentionSearch)
  );

  const insertMention = (member: User) => {
    const lastAtIndex = messageText.lastIndexOf('@');
    const newText = messageText.slice(0, lastAtIndex) + `@${member.full_name} `;
    setMessageText(newText);
    setSelectedMentions([...selectedMentions, member.id]);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  // Send message
  const sendMessage = async () => {
    if (!messageText.trim() && !voiceNote && !selectedImage) return;

    setSending(true);
    try {
      let attachmentUrl = null;
      let messageType = 'text';

      // Upload voice note
      if (voiceNote) {
        const formData = new FormData();
        const voiceFile = new File([voiceNote], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        formData.append('file', voiceFile);

        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          attachmentUrl = url;
          messageType = 'voice';
        }
      }

      // Upload image
      if (selectedImage) {
        const formData = new FormData();
        formData.append('file', selectedImage);

        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          attachmentUrl = url;
          messageType = 'image';
        }
      }

      // Send message
      const response = await fetch(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: messageText.trim() || null,
          message_type: messageType,
          attachment_url: attachmentUrl,
          reply_to_id: replyTo?.id || null,
          mentions: selectedMentions
        })
      });

      if (response.ok) {
        const newMessage = await response.json();
        setMessages(prev => [...prev, newMessage]);
        setMessageText('');
        setReplyTo(null);
        setSelectedMentions([]);
        cancelVoiceNote();
        cancelImage();
        lastMessageRef.current = newMessage.created_at;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Toggle reaction
  const toggleReaction = async (messageId: string, emoji: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/chat/${messageId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      });

      if (response.ok) {
        // Refresh messages to get updated reactions
        fetchMessages();
      }
      setShowEmojiPicker(null);
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  // Group reactions by emoji
  const groupReactions = (reactions: Reaction[]) => {
    const grouped: Record<string, { emoji: string; users: string[]; count: number; hasCurrentUser: boolean }> = {};

    reactions.forEach(r => {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = { emoji: r.emoji, users: [], count: 0, hasCurrentUser: false };
      }
      grouped[r.emoji].users.push(r.user.full_name);
      grouped[r.emoji].count++;
      if (r.user.id === currentUser?.id) {
        grouped[r.emoji].hasCurrentUser = true;
      }
    });

    return Object.values(grouped);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }

    if (showMentions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => Math.min(prev + 1, filteredMembers.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredMembers[mentionIndex]) {
          insertMention(filteredMembers[mentionIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowMentions(false);
      }
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Breadcrumb items={[
          { label: 'Projects', href: '/dashboard/projects' },
          { label: 'Project', href: `/dashboard/project/${projectId}` },
          { label: 'Chat' }
        ]} />
        <div className="card p-4 space-y-4" style={{ height: 'calc(100vh - 280px)' }}>
          <ChatMessageSkeleton />
          <ChatMessageSkeleton isOwn />
          <ChatMessageSkeleton />
          <ChatMessageSkeleton isOwn />
          <ChatMessageSkeleton />
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
        { label: 'Chat', icon: 'fas fa-comments' }
      ]} />

      {/* Page Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            <i className="fas fa-comments mr-2 text-green-500"></i>
            Team Chat
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {members.length} team member{members.length !== 1 ? 's' : ''} in this project
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="card mb-4 p-1">
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
            href={`/dashboard/project/${projectId}/modules`}
            className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors"
          >
            <i className="fas fa-cubes"></i>
            Modules
          </a>
          <a
            href={`/dashboard/project/${projectId}/chat`}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-medium text-sm"
          >
            <i className="fas fa-comments"></i>
            Chat
          </a>
        </div>
      </div>

      {/* Chat Container */}
      <div className="card flex flex-col" style={{ height: 'calc(100vh - 280px)' }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <NoMessagesEmptyState />
            </div>
          ) : (
            messages.map((message, index) => {
              const isOwn = message.sender.id === currentUser?.id;
              const showAvatar = index === 0 || messages[index - 1].sender.id !== message.sender.id;
              const groupedReactions = groupReactions(message.reactions || []);

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} gap-2 max-w-[75%]`}>
                    {/* Avatar */}
                    {showAvatar && !isOwn && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {message.sender.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {!showAvatar && !isOwn && <div className="w-8"></div>}

                    {/* Message Bubble */}
                    <div className="group relative">
                      {/* Sender name */}
                      {showAvatar && !isOwn && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">
                          {message.sender.full_name}
                        </p>
                      )}

                      {/* Reply indicator */}
                      {message.reply_to && (
                        <div className={`text-xs mb-1 px-2 py-1 rounded border-l-2 ${isOwn ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-400' : 'bg-gray-100 dark:bg-gray-700 border-gray-400'}`}>
                          <span className="text-gray-500">Replying to {message.reply_to.sender.full_name}</span>
                          <p className="text-gray-600 dark:text-gray-400 truncate">{message.reply_to.content}</p>
                        </div>
                      )}

                      {/* Message content */}
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isOwn
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-br-md'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-bl-md'
                        }`}
                      >
                        {/* Voice message */}
                        {message.message_type === 'voice' && message.attachment_url && (
                          <div className="flex items-center gap-2 mb-2">
                            <i className="fas fa-microphone"></i>
                            <audio src={message.attachment_url} controls className="h-8" />
                          </div>
                        )}

                        {/* Image message */}
                        {message.message_type === 'image' && message.attachment_url && (
                          <a href={message.attachment_url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={message.attachment_url}
                              alt="Shared image"
                              className="max-w-xs rounded-lg mb-2 cursor-pointer hover:opacity-90"
                            />
                          </a>
                        )}

                        {/* Text content */}
                        {message.content && (
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        )}

                        {/* Timestamp */}
                        <p className={`text-xs mt-1 ${isOwn ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'}`}>
                          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      {/* Reactions */}
                      {groupedReactions.length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          {groupedReactions.map((r, i) => (
                            <button
                              key={i}
                              onClick={() => toggleReaction(message.id, r.emoji)}
                              className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${
                                r.hasCurrentUser
                                  ? 'bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300'
                                  : 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                              } hover:scale-110 transition-transform`}
                              title={r.users.join(', ')}
                            >
                              <span>{r.emoji}</span>
                              <span className="text-gray-600 dark:text-gray-400">{r.count}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Action buttons (on hover) */}
                      <div className={`absolute top-0 ${isOwn ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1`}>
                        <button
                          onClick={() => setReplyTo(message)}
                          className="p-1.5 bg-white dark:bg-gray-800 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Reply"
                        >
                          <i className="fas fa-reply text-xs text-gray-600 dark:text-gray-400"></i>
                        </button>
                        <button
                          onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                          className="p-1.5 bg-white dark:bg-gray-800 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="React"
                        >
                          <i className="fas fa-smile text-xs text-gray-600 dark:text-gray-400"></i>
                        </button>

                        {/* Emoji picker */}
                        {showEmojiPicker === message.id && (
                          <div className="absolute top-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2 flex gap-1 z-10">
                            {EMOJI_OPTIONS.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => toggleReaction(message.id, emoji)}
                                className="text-xl hover:scale-125 transition-transform p-1"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply preview */}
        {replyTo && (
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-t dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fas fa-reply text-gray-400"></i>
              <div>
                <p className="text-xs text-gray-500">Replying to {replyTo.sender.full_name}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-md">{replyTo.content}</p>
              </div>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {/* Voice note preview */}
        {voiceNote && (
          <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-t dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <i className="fas fa-microphone text-indigo-500"></i>
              <span className="text-sm text-gray-700 dark:text-gray-300">Voice note ({formatTime(recordingTime)})</span>
              <audio src={voiceNoteUrl!} controls className="h-8" />
            </div>
            <button onClick={cancelVoiceNote} className="text-red-500 hover:text-red-700">
              <i className="fas fa-trash"></i>
            </button>
          </div>
        )}

        {/* Image preview */}
        {imagePreview && (
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-t dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={imagePreview} alt="Preview" className="h-16 rounded" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{selectedImage?.name}</span>
            </div>
            <button onClick={cancelImage} className="text-red-500 hover:text-red-700">
              <i className="fas fa-trash"></i>
            </button>
          </div>
        )}

        {/* Input area */}
        <div className="p-4 border-t dark:border-gray-700">
          {/* Mentions dropdown */}
          {showMentions && filteredMembers.length > 0 && (
            <div className="mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700 max-h-40 overflow-y-auto">
              {filteredMembers.map((member, index) => (
                <button
                  key={member.id}
                  onClick={() => insertMention(member)}
                  className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    index === mentionIndex ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs">
                    {member.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{member.full_name}</p>
                    <p className="text-xs text-gray-500">{member.role}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            {/* Attachment buttons */}
            <div className="flex gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
              <Tooltip content="Attach image">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors"
                >
                  <i className="fas fa-image"></i>
                </button>
              </Tooltip>

              {!isRecording && !voiceNote && (
                <Tooltip content="Record voice note">
                  <button
                    onClick={startRecording}
                    className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                  >
                    <i className="fas fa-microphone"></i>
                  </button>
                </Tooltip>
              )}

              {isRecording && (
                <Tooltip content="Stop recording">
                  <button
                    onClick={stopRecording}
                    className="p-2.5 bg-red-500 text-white rounded-xl animate-pulse flex items-center gap-2"
                  >
                    <i className="fas fa-stop"></i>
                    <span className="text-sm">{formatTime(recordingTime)}</span>
                  </button>
                </Tooltip>
              )}
            </div>

            {/* Text input */}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={messageText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message... (@ to mention)"
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-800 dark:text-white placeholder-gray-500"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>

            {/* Send button */}
            <Tooltip content="Send message">
              <button
                onClick={sendMessage}
                disabled={sending || (!messageText.trim() && !voiceNote && !selectedImage)}
                className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {sending ? (
                  <i className="fas fa-spinner animate-spin"></i>
                ) : (
                  <i className="fas fa-paper-plane"></i>
                )}
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
