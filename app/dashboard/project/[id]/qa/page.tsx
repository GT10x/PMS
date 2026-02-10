'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Breadcrumb from '@/components/Breadcrumb';
import ProjectNavTabs from '@/components/ProjectNavTabs';
import { useProjectPermissions } from '@/hooks/useProjectPermissions';
import type { QAQuestion, QAComment } from '@/lib/types';

interface User {
  id: string;
  full_name: string;
  role: string;
  is_admin?: boolean;
}

interface Stats {
  total: number;
  answered: number;
  pending: number;
  deferred: number;
  follow_up: number;
  by_assignee: { user_id: string; full_name: string; total: number; answered: number }[];
  by_topic: { topic: string; total: number; answered: number }[];
  by_priority: Record<string, { total: number; answered: number }>;
}

const PRIORITY_COLORS: Record<string, string> = {
  must: 'bg-red-500/15 text-red-500',
  should: 'bg-amber-500/15 text-amber-500',
  nice: 'bg-indigo-500/15 text-indigo-500',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-400/15 text-gray-400',
  answered: 'bg-emerald-500/15 text-emerald-500',
  deferred: 'bg-orange-400/15 text-orange-400',
  follow_up: 'bg-purple-500/15 text-purple-500',
};

const STATUS_ICONS: Record<string, string> = {
  pending: 'fa-clock',
  answered: 'fa-check-circle',
  deferred: 'fa-share',
  follow_up: 'fa-reply',
};

export default function QAPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { hasAccess } = useProjectPermissions(projectId);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<QAQuestion | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTopic, setFilterTopic] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Answer form
  const [answerText, setAnswerText] = useState('');
  const [commentText, setCommentText] = useState('');
  const [deferTo, setDeferTo] = useState('');
  const [deferNote, setDeferNote] = useState('');
  const [showDeferForm, setShowDeferForm] = useState(false);

  // Mobile state
  const [showDetail, setShowDetail] = useState(false);

  const answerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchStats();
    fetchQuestions();
  }, [projectId]);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user || data);
      }
    } catch (e) {
      console.error('Error fetching user:', e);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/qa/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}/qa`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
    } catch (e) {
      console.error('Error fetching questions:', e);
    } finally {
      setLoading(false);
    }
  };

  const selectQuestion = async (q: QAQuestion) => {
    setDetailLoading(true);
    setShowDetail(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/qa/${q.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedQuestion(data.question);
        setAnswerText(data.question.answer_text || '');
        setShowDeferForm(false);
        setDeferTo('');
        setDeferNote('');
      }
    } catch (e) {
      console.error('Error fetching question detail:', e);
    } finally {
      setDetailLoading(false);
    }
  };

  const saveAnswer = async () => {
    if (!selectedQuestion || !answerText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/qa/${selectedQuestion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer_text: answerText.trim(),
          answer_status: 'answered',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedQuestion(prev => prev ? { ...prev, ...data.question } : null);
        setQuestions(prev => prev.map(q => q.id === data.question.id ? { ...q, ...data.question } : q));
        fetchStats();
      }
    } catch (e) {
      console.error('Error saving answer:', e);
    } finally {
      setSaving(false);
    }
  };

  const deferQuestion = async () => {
    if (!selectedQuestion || !deferTo.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/qa/${selectedQuestion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer_status: 'deferred',
          deferred_to: deferTo.trim(),
          deferred_note: deferNote.trim() || null,
          answer_text: answerText.trim() || `Deferred to ${deferTo.trim()}.`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedQuestion(prev => prev ? { ...prev, ...data.question } : null);
        setQuestions(prev => prev.map(q => q.id === data.question.id ? { ...q, ...data.question } : q));
        setShowDeferForm(false);
        fetchStats();
      }
    } catch (e) {
      console.error('Error deferring question:', e);
    } finally {
      setSaving(false);
    }
  };

  const addComment = async () => {
    if (!selectedQuestion || !commentText.trim()) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/qa/${selectedQuestion.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedQuestion(prev => prev ? {
          ...prev,
          comments: [...(prev.comments || []), data.comment],
        } : null);
        setCommentText('');
      }
    } catch (e) {
      console.error('Error adding comment:', e);
    }
  };

  // Derived data
  const topics = [...new Set(questions.map(q => q.topic))].sort();

  const filteredQuestions = questions.filter(q => {
    if (filterStatus !== 'all' && q.answer_status !== filterStatus) return false;
    if (filterTopic !== 'all' && q.topic !== filterTopic) return false;
    if (filterPriority !== 'all' && q.priority !== filterPriority) return false;
    if (filterAssignee !== 'all' && q.assigned_to !== filterAssignee) return false;
    if (searchQuery && !q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) && !q.question_id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const canAnswer = (q: QAQuestion) => {
    if (!currentUser) return false;
    if (currentUser.is_admin) return true;
    return q.assigned_to === currentUser.id;
  };

  return (
    <DashboardLayout>
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Project', href: `/dashboard/project/${projectId}` },
        { label: 'Q&A' },
      ]} />
      <ProjectNavTabs projectId={projectId} activeTab="qa" hasAccess={hasAccess} />

      {/* Stats Strip */}
      {stats && (
        <div className="card mb-4 p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500">Progress</span>
              <span className="text-lg font-bold text-white">{stats.answered}/{stats.total}</span>
              <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                  style={{ width: `${stats.total ? (stats.answered / stats.total * 100) : 0}%` }}
                />
              </div>
            </div>
            {currentUser?.is_admin && stats.by_assignee.length > 0 && (
              <div className="flex gap-4">
                {stats.by_assignee.map(a => (
                  <div key={a.user_id} className="text-center">
                    <div className="text-xs text-gray-400">{a.full_name}</div>
                    <div className="text-sm font-semibold text-white">{a.answered}/{a.total}</div>
                    <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${a.total ? (a.answered / a.total * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex gap-4" style={{ height: 'calc(100vh - 280px)' }}>
        {/* Left Panel - Question List */}
        <div className={`${showDetail ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[420px] md:min-w-[420px]`}>
          {/* Filters */}
          <div className="card p-3 mb-3 space-y-2">
            {/* Search */}
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            {/* Filter chips */}
            <div className="flex flex-wrap gap-1.5">
              {(currentUser?.is_admin
                ? ['all', 'pending', 'answered', 'deferred']
                : ['all', 'pending', 'answered', 'deferred']
              ).map(f => (
                <button
                  key={f}
                  onClick={() => {
                    if (f === 'all') {
                      setFilterStatus('all');
                      setFilterAssignee('all');
                    } else {
                      setFilterStatus(filterStatus === f ? 'all' : f);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    (f === 'all' && filterStatus === 'all') ||
                    (f !== 'all' && filterStatus === f)
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                      : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                  }`}
                >
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              {/* Admin-only: filter by assignee */}
              {currentUser?.is_admin && stats?.by_assignee && (
                <select
                  value={filterAssignee}
                  onChange={e => setFilterAssignee(e.target.value)}
                  className="px-2 py-1 bg-gray-800 border border-gray-700 rounded-md text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Users</option>
                  {stats.by_assignee.map(a => (
                    <option key={a.user_id} value={a.user_id}>{a.full_name}</option>
                  ))}
                </select>
              )}
            </div>
            {/* Dropdowns */}
            <div className="flex gap-2">
              <select
                value={filterTopic}
                onChange={e => setFilterTopic(e.target.value)}
                className="flex-1 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Topics</option>
                {topics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
                className="w-24 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">Priority</option>
                <option value="must">Must</option>
                <option value="should">Should</option>
                <option value="nice">Nice</option>
              </select>
            </div>
          </div>

          {/* Question Cards */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <i className="fas fa-spinner fa-spin text-indigo-400 text-2xl"></i>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <i className="fas fa-comments text-4xl mb-3 block opacity-40"></i>
                <p>No questions match your filters</p>
              </div>
            ) : (
              filteredQuestions.map(q => (
                <button
                  key={q.id}
                  onClick={() => selectQuestion(q)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedQuestion?.id === q.id
                      ? 'border-indigo-500 bg-indigo-500/8'
                      : q.answer_status === 'answered'
                        ? 'border-transparent bg-gray-800/50 opacity-70 hover:opacity-100 hover:border-gray-600'
                        : 'border-transparent bg-gray-800/80 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start gap-2 mb-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${PRIORITY_COLORS[q.priority] || ''}`}>
                      {q.priority}
                    </span>
                    <span className="text-xs font-mono text-indigo-400">{q.question_id}</span>
                    <span className="text-xs text-gray-500 ml-auto">{q.topic}</span>
                  </div>
                  <p className="text-sm text-gray-200 line-clamp-2 mb-2">{q.question_text}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{q.assigned_user?.full_name || '—'}</span>
                    <span>·</span>
                    <span className={`inline-flex items-center gap-1 ${STATUS_COLORS[q.answer_status] || ''} px-1.5 py-0.5 rounded`}>
                      <i className={`fas ${STATUS_ICONS[q.answer_status] || ''} text-[10px]`}></i>
                      {q.answer_status.replace('_', ' ')}
                    </span>
                  </div>
                </button>
              ))
            )}
            <div className="text-center text-xs text-gray-600 py-2">
              {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Right Panel - Question Detail */}
        <div className={`${showDetail ? 'flex' : 'hidden md:flex'} flex-col flex-1 card overflow-hidden`}>
          {detailLoading ? (
            <div className="flex items-center justify-center flex-1">
              <i className="fas fa-spinner fa-spin text-indigo-400 text-2xl"></i>
            </div>
          ) : !selectedQuestion ? (
            <div className="flex items-center justify-center flex-1 text-gray-500">
              <div className="text-center">
                <i className="fas fa-hand-pointer text-4xl mb-3 block opacity-40"></i>
                <p>Select a question to view details</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Mobile back button */}
              <button
                onClick={() => { setShowDetail(false); setSelectedQuestion(null); }}
                className="md:hidden flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-2"
              >
                <i className="fas fa-arrow-left"></i> Back to list
              </button>

              {/* Header */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-indigo-400 font-bold">{selectedQuestion.question_id}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${PRIORITY_COLORS[selectedQuestion.priority] || ''}`}>
                    {selectedQuestion.priority}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[selectedQuestion.answer_status] || ''}`}>
                    <i className={`fas ${STATUS_ICONS[selectedQuestion.answer_status] || ''} mr-1`}></i>
                    {selectedQuestion.answer_status.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-xs text-gray-500 flex gap-2">
                  <span>Topic: {selectedQuestion.topic}</span>
                  <span>·</span>
                  <span>Assigned: {selectedQuestion.assigned_user?.full_name || '—'}</span>
                  {selectedQuestion.round && <>
                    <span>·</span>
                    <span>{selectedQuestion.round}</span>
                  </>}
                </div>
              </div>

              {/* Question */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Question</h3>
                <p className="text-gray-200 whitespace-pre-wrap">{selectedQuestion.question_text}</p>
              </div>

              {/* Context */}
              {selectedQuestion.context && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Context / Options</h3>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap bg-gray-800/50 rounded-lg p-3">{selectedQuestion.context}</p>
                </div>
              )}

              {/* CTO Response */}
              {selectedQuestion.cto_response && (
                <div className="border-l-[3px] border-indigo-500 bg-indigo-500/8 rounded-r-lg p-4">
                  <div className="text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">CTO Analysis</div>
                  <div className="text-sm text-gray-200 prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selectedQuestion.cto_response }} />
                </div>
              )}

              {/* Deferred info */}
              {selectedQuestion.answer_status === 'deferred' && selectedQuestion.deferred_to && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                  <div className="text-orange-400 text-xs font-semibold mb-1">
                    <i className="fas fa-share mr-1"></i> Deferred to {selectedQuestion.deferred_to}
                  </div>
                  {selectedQuestion.deferred_note && (
                    <p className="text-sm text-gray-300">{selectedQuestion.deferred_note}</p>
                  )}
                </div>
              )}

              {/* Answer Section */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {selectedQuestion.answer_status === 'answered' ? 'Answer' : 'Your Answer'}
                </h3>
                {canAnswer(selectedQuestion) ? (
                  <div className="space-y-3">
                    <textarea
                      ref={answerRef}
                      value={answerText}
                      onChange={e => setAnswerText(e.target.value)}
                      rows={4}
                      placeholder="Type your answer here..."
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-y"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={saveAnswer}
                        disabled={saving || !answerText.trim()}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all"
                      >
                        {saving ? <><i className="fas fa-spinner fa-spin mr-1"></i> Saving...</> : <><i className="fas fa-save mr-1"></i> Save Answer</>}
                      </button>
                      <button
                        onClick={() => setShowDeferForm(!showDeferForm)}
                        className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-600 transition-all"
                      >
                        <i className="fas fa-share mr-1"></i> Defer to...
                      </button>
                    </div>
                    {showDeferForm && (
                      <div className="bg-gray-800/50 rounded-lg p-3 space-y-2 border border-gray-700">
                        <input
                          type="text"
                          value={deferTo}
                          onChange={e => setDeferTo(e.target.value)}
                          placeholder="Defer to (e.g., Manishbhai)"
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                        />
                        <input
                          type="text"
                          value={deferNote}
                          onChange={e => setDeferNote(e.target.value)}
                          placeholder="Reason for deferring (optional)"
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={deferQuestion}
                          disabled={saving || !deferTo.trim()}
                          className="px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg text-sm font-medium hover:bg-orange-500/30 disabled:opacity-50 transition-all"
                        >
                          {saving ? 'Saving...' : 'Defer Question'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : selectedQuestion.answer_text ? (
                  <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-lg p-3">
                    <p className="text-sm text-gray-200 whitespace-pre-wrap">{selectedQuestion.answer_text}</p>
                    {selectedQuestion.answered_at && (
                      <p className="text-xs text-gray-500 mt-2">
                        Answered {new Date(selectedQuestion.answered_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No answer yet</p>
                )}
              </div>

              {/* Follow-up Questions */}
              {selectedQuestion.children && selectedQuestion.children.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Follow-up Questions ({selectedQuestion.children.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedQuestion.children.map(child => (
                      <button
                        key={child.id}
                        onClick={() => selectQuestion(child)}
                        className="w-full text-left p-3 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-gray-600 transition-all"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-indigo-400 text-xs">{child.question_id}</span>
                          <span className="text-xs text-gray-500">{child.topic}</span>
                          <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] ${STATUS_COLORS[child.answer_status] || ''}`}>
                            {child.answer_status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 line-clamp-1">{child.question_text}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Discussion {selectedQuestion.comments && selectedQuestion.comments.length > 0 ? `(${selectedQuestion.comments.length})` : ''}
                </h3>
                {selectedQuestion.comments && selectedQuestion.comments.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {selectedQuestion.comments.map(c => (
                      <div key={c.id} className={`p-3 rounded-lg text-sm ${c.is_cto_response ? 'bg-indigo-500/8 border-l-2 border-indigo-500' : 'bg-gray-800/50'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-300">{c.user?.full_name || 'Unknown'}</span>
                          <span className="text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString()}</span>
                          {c.is_cto_response && <span className="text-[10px] text-indigo-400 font-semibold">CTO</span>}
                        </div>
                        <p className="text-gray-300 whitespace-pre-wrap">{c.content}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addComment()}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={addComment}
                    disabled={!commentText.trim()}
                    className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 disabled:opacity-50 transition-all"
                  >
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
