'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Breadcrumb from '@/components/Breadcrumb';
import ContactForm from '@/components/contacts/ContactForm';
import VoiceRecorder from '@/components/contacts/VoiceRecorder';
import ReminderForm from '@/components/contacts/ReminderForm';
import TagManager from '@/components/contacts/TagManager';

interface Tag { id: string; name: string; color: string; }
interface Remark { id: string; content: string | null; voice_url: string | null; created_at: string; }
interface Attachment { id: string; file_url: string; label: string | null; created_at: string; }
interface Reminder { id: string; reminder_date: string; cadence: string; note: string | null; is_done: boolean; created_at: string; }

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [contact, setContact] = useState<any>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newRemark, setNewRemark] = useState('');
  const [addingRemark, setAddingRemark] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showWhatsAppPicker, setShowWhatsAppPicker] = useState(false);
  const [attachLabelInput, setAttachLabelInput] = useState('');
  const [pendingAttachUrl, setPendingAttachUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchContact();
    fetchTags();
  }, [id]);

  const fetchContact = async () => {
    const res = await fetch(`/api/contacts/${id}`);
    if (res.status === 403) { router.push('/dashboard'); return; }
    if (res.status === 404) { router.push('/dashboard/contacts'); return; }
    if (res.ok) {
      const data = await res.json();
      setContact(data.contact);
    }
    setLoading(false);
  };

  const fetchTags = async () => {
    const res = await fetch('/api/contacts/tags');
    if (res.ok) {
      const data = await res.json();
      setAllTags(data.tags || []);
    }
  };

  const handleUpdate = async (data: any) => {
    const res = await fetch(`/api/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setEditing(false);
      fetchContact();
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this contact permanently?')) return;
    setDeleting(true);
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
    router.push('/dashboard/contacts');
  };

  const handleCreateTag = async (name: string, color: string): Promise<Tag | null> => {
    const res = await fetch('/api/contacts/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
    if (res.ok) {
      const data = await res.json();
      setAllTags(prev => [...prev, data.tag]);
      return data.tag;
    }
    return null;
  };

  const addRemark = async (voiceUrl?: string) => {
    if (!newRemark.trim() && !voiceUrl) return;
    setAddingRemark(true);
    await fetch(`/api/contacts/${id}/remarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newRemark || null, voice_url: voiceUrl || null }),
    });
    setNewRemark('');
    setAddingRemark(false);
    fetchContact();
  };

  const deleteRemark = async (remarkId: string) => {
    await fetch(`/api/contacts/${id}/remarks/${remarkId}`, { method: 'DELETE' });
    fetchContact();
  };

  const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error();
      const { url } = await uploadRes.json();
      // Show label input instead of browser prompt
      setPendingAttachUrl(url);
      setAttachLabelInput('');
    } catch {
      alert('Failed to upload');
      setUploadingAttachment(false);
    }
  };

  const saveAttachmentWithLabel = async () => {
    if (!pendingAttachUrl) return;
    await fetch(`/api/contacts/${id}/attachments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_url: pendingAttachUrl, label: attachLabelInput || 'Photo' }),
    });
    setPendingAttachUrl(null);
    setUploadingAttachment(false);
    fetchContact();
  };

  const deleteAttachment = async (attId: string) => {
    await fetch(`/api/contacts/${id}/attachments/${attId}`, { method: 'DELETE' });
    fetchContact();
  };

  const addReminder = async (data: { reminder_date: string; cadence: string; note: string }) => {
    await fetch(`/api/contacts/${id}/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setShowReminderForm(false);
    fetchContact();
  };

  const toggleReminderDone = async (reminder: Reminder) => {
    await fetch(`/api/contacts/${id}/reminders/${reminder.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_done: !reminder.is_done }),
    });
    fetchContact();
  };

  const deleteReminder = async (remId: string) => {
    await fetch(`/api/contacts/${id}/reminders/${remId}`, { method: 'DELETE' });
    fetchContact();
  };

  const toggleFavorite = async () => {
    await fetch(`/api/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: !contact.is_favorite }),
    });
    fetchContact();
  };

  const updateTags = async (tagIds: string[]) => {
    await fetch(`/api/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagIds }),
    });
    fetchContact();
  };

  // Clean phone number for dialing/WhatsApp
  const cleanNumber = (num: string) => {
    let digits = num.replace(/[^\d+]/g, '');
    // If starts with 0, replace with +91
    if (digits.startsWith('0') && digits.length === 11) digits = '+91' + digits.substring(1);
    // If just 10 digits, add +91
    if (/^\d{10}$/.test(digits)) digits = '+91' + digits;
    return digits;
  };

  // Get all callable numbers (phones + whatsapp field)
  const getWhatsAppNumbers = () => {
    const numbers: { label: string; number: string }[] = [];
    for (const p of contact.phones || []) {
      if (p.number) numbers.push({ label: `${p.type}: ${p.number}`, number: cleanNumber(p.number) });
    }
    if (contact.whatsapp) {
      const waNum = cleanNumber(contact.whatsapp);
      if (!numbers.some(n => n.number === waNum)) {
        numbers.push({ label: `WhatsApp: ${contact.whatsapp}`, number: waNum });
      }
    }
    return numbers;
  };

  const openWhatsApp = (number?: string) => {
    const nums = getWhatsAppNumbers();
    if (!number && nums.length === 0) {
      alert('No phone number available for WhatsApp');
      return;
    }
    if (!number && nums.length === 1) {
      window.open(`https://wa.me/${nums[0].number.replace('+', '')}`, '_blank');
      return;
    }
    if (!number && nums.length > 1) {
      setShowWhatsAppPicker(true);
      return;
    }
    window.open(`https://wa.me/${number!.replace('+', '')}`, '_blank');
    setShowWhatsAppPicker(false);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (d: string) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const isOverdue = (d: string) => new Date(d) < new Date(new Date().toDateString());

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!contact) return null;

  if (editing) {
    return (
      <DashboardLayout>
        <Breadcrumb items={[
          { label: 'Dashboard', href: '/dashboard', icon: 'fas fa-home' },
          { label: 'Contacts', href: '/dashboard/contacts', icon: 'fas fa-address-book' },
          { label: 'Edit' }
        ]} />
        <div className="card p-6 max-w-3xl">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <i className="fas fa-edit mr-2 text-indigo-500"></i>Edit Contact
          </h2>
          <ContactForm contact={contact} allTags={allTags} onSave={handleUpdate} onCancel={() => setEditing(false)} onCreateTag={handleCreateTag} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard', icon: 'fas fa-home' },
        { label: 'Contacts', href: '/dashboard/contacts', icon: 'fas fa-address-book' },
        { label: contact.full_name }
      ]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start gap-4 mb-6">
        <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
          {contact.profile_photo_url ? (
            <img src={contact.profile_photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl font-bold text-gray-400">{contact.full_name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{contact.full_name}</h1>
            <button onClick={toggleFavorite} className="text-lg">
              <i className={`${contact.is_favorite ? 'fas text-yellow-500' : 'far text-gray-300'} fa-star hover:text-yellow-500 transition-colors`}></i>
            </button>
          </div>
          {contact.title && <p className="text-gray-600 dark:text-gray-400">{contact.title}</p>}
          {contact.company && <p className="text-gray-500 dark:text-gray-500 text-sm"><i className="fas fa-building mr-1"></i>{contact.company}</p>}
          {contact.nickname && <p className="text-gray-400 text-sm italic">aka &ldquo;{contact.nickname}&rdquo;</p>}

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 mt-3">
            {contact.phones?.[0] && (
              <a href={`tel:${cleanNumber(contact.phones[0].number)}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">
                <i className="fas fa-phone"></i> Call
              </a>
            )}
            {(contact.phones?.length > 0 || contact.whatsapp) && (
              <button onClick={() => openWhatsApp()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] text-white rounded-lg text-sm hover:bg-[#1da851]">
                <i className="fab fa-whatsapp"></i> WhatsApp
              </button>
            )}
            {contact.emails?.[0] && (
              <a href={`mailto:${contact.emails[0].email}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                <i className="fas fa-envelope"></i> Email
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(true)} className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-sm">
            <i className="fas fa-edit mr-1"></i>Edit
          </button>
          <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm disabled:opacity-50">
            <i className="fas fa-trash mr-1"></i>{deleting ? '...' : 'Delete'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Contact Info */}
        <div className="space-y-6">
          {/* Contact Details Card */}
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-white text-sm uppercase tracking-wide">Contact Info</h3>

            {contact.phones?.length > 0 && (
              <div>
                {contact.phones.map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 py-1.5">
                    <a href={`tel:${cleanNumber(p.number)}`} className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors">
                      <i className="fas fa-phone text-green-600 dark:text-green-400 text-xs"></i>
                    </a>
                    <div className="flex-1 min-w-0">
                      <a href={`tel:${cleanNumber(p.number)}`} className="text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-500">{p.number}</a>
                      <span className="text-[10px] text-gray-400 uppercase ml-2">{p.type}</span>
                    </div>
                    <button onClick={() => openWhatsApp(cleanNumber(p.number))} title="WhatsApp"
                      className="w-7 h-7 bg-[#25D366]/10 rounded-full flex items-center justify-center hover:bg-[#25D366]/20 transition-colors">
                      <i className="fab fa-whatsapp text-[#25D366] text-sm"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {contact.emails?.length > 0 && (
              <div>
                {contact.emails.map((e: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <i className="fas fa-envelope text-blue-500 text-xs"></i>
                    </div>
                    <a href={`mailto:${e.email}`} className="text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-500 truncate flex-1">{e.email}</a>
                    <span className="text-[10px] text-gray-400 uppercase">{e.type}</span>
                  </div>
                ))}
              </div>
            )}

            {contact.address && (
              <div className="flex items-start gap-2 py-1">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="fas fa-map-marker-alt text-red-500 text-xs"></i>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{contact.address}</p>
              </div>
            )}

            {/* Social Links */}
            <div className="flex gap-3 pt-2">
              {contact.linkedin && <a href={contact.linkedin} target="_blank" className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors"><i className="fab fa-linkedin text-blue-600"></i></a>}
              {contact.whatsapp && (
                <button onClick={() => openWhatsApp(cleanNumber(contact.whatsapp))} className="w-9 h-9 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center hover:bg-green-200 transition-colors">
                  <i className="fab fa-whatsapp text-[#25D366]"></i>
                </button>
              )}
              {contact.instagram && <a href={`https://instagram.com/${contact.instagram.replace('@', '')}`} target="_blank" className="w-9 h-9 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center hover:bg-pink-200 transition-colors"><i className="fab fa-instagram text-pink-500"></i></a>}
              {contact.website && <a href={contact.website} target="_blank" className="w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"><i className="fas fa-globe text-gray-500"></i></a>}
            </div>
          </div>

          {/* Tags */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 dark:text-white text-sm uppercase tracking-wide mb-3">Tags</h3>
            <TagManager
              allTags={allTags}
              selectedTagIds={contact.tags?.map((t: any) => t.id) || []}
              onTagsChange={updateTags}
              onCreateTag={handleCreateTag}
            />
          </div>

          {/* How We Met */}
          {(contact.met_at_event || contact.met_at_location || contact.introduced_by) && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 dark:text-white text-sm uppercase tracking-wide mb-3">
                <i className="fas fa-handshake mr-1 text-indigo-500"></i>How We Met
              </h3>
              {contact.met_at_event && <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Event:</strong> {contact.met_at_event}</p>}
              {contact.met_at_location && <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Location:</strong> {contact.met_at_location}</p>}
              {contact.met_at_date && <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Date:</strong> {formatDate(contact.met_at_date)}</p>}
              {contact.introduced_by && <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Introduced by:</strong> {contact.introduced_by}</p>}
            </div>
          )}

          {/* Important Dates */}
          {(contact.birthday || contact.anniversary) && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 dark:text-white text-sm uppercase tracking-wide mb-3">
                <i className="fas fa-calendar-alt mr-1 text-indigo-500"></i>Important Dates
              </h3>
              {contact.birthday && <p className="text-sm text-gray-700 dark:text-gray-300"><i className="fas fa-birthday-cake text-pink-500 mr-2"></i>Birthday: {formatDate(contact.birthday)}</p>}
              {contact.anniversary && <p className="text-sm text-gray-700 dark:text-gray-300 mt-1"><i className="fas fa-heart text-red-500 mr-2"></i>Anniversary: {formatDate(contact.anniversary)}</p>}
            </div>
          )}
        </div>

        {/* Middle Column - Remarks Timeline */}
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 dark:text-white text-sm uppercase tracking-wide mb-4">
              <i className="fas fa-comments mr-1 text-indigo-500"></i>Remarks & Notes
            </h3>

            {/* Add remark */}
            <div className="space-y-2 mb-4">
              <textarea value={newRemark} onChange={e => setNewRemark(e.target.value)}
                placeholder="Add a note about this contact..."
                rows={2} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm" />
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => addRemark()} disabled={addingRemark || !newRemark.trim()}
                  className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600 disabled:opacity-50">
                  {addingRemark ? '...' : 'Add Note'}
                </button>
                <VoiceRecorder onRecorded={(url) => addRemark(url)} />
              </div>
            </div>

            {/* Remarks list */}
            <div className="space-y-3">
              {(contact.remarks || []).map((remark: Remark) => (
                <div key={remark.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {remark.content && <p className="text-sm text-gray-700 dark:text-gray-300">{remark.content}</p>}
                      {remark.voice_url && (
                        <audio controls src={remark.voice_url} className="mt-2 h-8 w-full max-w-xs" />
                      )}
                    </div>
                    <button onClick={() => deleteRemark(remark.id)}
                      className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                      <i className="fas fa-trash text-xs"></i>
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{formatTime(remark.created_at)}</p>
                </div>
              ))}
              {(!contact.remarks || contact.remarks.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-4">No remarks yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Attachments & Reminders */}
        <div className="space-y-6">
          {/* Attachments */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 dark:text-white text-sm uppercase tracking-wide">
                <i className="fas fa-paperclip mr-1 text-indigo-500"></i>Attachments
              </h3>
              <div className="flex gap-1">
                {/* Camera button */}
                <label className="cursor-pointer w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors" title="Take Photo">
                  <i className="fas fa-camera text-green-600 text-xs"></i>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAttachFile} disabled={uploadingAttachment} />
                </label>
                {/* Gallery button */}
                <label className="cursor-pointer w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors" title="Choose Photo">
                  <i className="fas fa-image text-indigo-600 text-xs"></i>
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleAttachFile} disabled={uploadingAttachment} />
                </label>
              </div>
            </div>

            {/* Uploading / Label Input */}
            {uploadingAttachment && !pendingAttachUrl && (
              <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                Uploading...
              </div>
            )}
            {pendingAttachUrl && (
              <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
                <img src={pendingAttachUrl} alt="" className="w-full max-h-32 object-contain rounded" />
                <input type="text" value={attachLabelInput} onChange={e => setAttachLabelInput(e.target.value)}
                  placeholder="Label (e.g. Visiting Card, Event Photo)"
                  className="w-full px-3 py-1.5 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
                <div className="flex gap-2">
                  <button onClick={saveAttachmentWithLabel} className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600">Save</button>
                  <button onClick={() => { setPendingAttachUrl(null); setUploadingAttachment(false); }}
                    className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-sm">Cancel</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {(contact.attachments || []).map((att: Attachment) => (
                <div key={att.id} className="relative group">
                  <div onClick={() => setLightboxUrl(att.file_url)}
                    className="cursor-pointer rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 aspect-square">
                    <img src={att.file_url} alt={att.label || ''} className="w-full h-full object-cover" />
                  </div>
                  {att.label && <p className="text-[10px] text-gray-500 mt-1 truncate">{att.label}</p>}
                  <button onClick={() => deleteAttachment(att.id)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
            </div>
            {(!contact.attachments || contact.attachments.length === 0) && !pendingAttachUrl && (
              <p className="text-sm text-gray-400 text-center py-4">No attachments</p>
            )}
          </div>

          {/* Reminders */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 dark:text-white text-sm uppercase tracking-wide">
                <i className="fas fa-bell mr-1 text-indigo-500"></i>Reminders
              </h3>
              <button onClick={() => setShowReminderForm(!showReminderForm)}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                <i className="fas fa-plus mr-1"></i>Add
              </button>
            </div>

            {showReminderForm && (
              <div className="mb-4">
                <ReminderForm onSave={addReminder} onCancel={() => setShowReminderForm(false)} />
              </div>
            )}

            <div className="space-y-2">
              {(contact.reminders || []).map((rem: Reminder) => (
                <div key={rem.id} className={`flex items-center gap-3 p-3 rounded-lg group ${
                  rem.is_done ? 'bg-gray-50 dark:bg-gray-700/50 opacity-60' :
                  isOverdue(rem.reminder_date) ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-700'
                }`}>
                  <button onClick={() => toggleReminderDone(rem)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      rem.is_done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-gray-500 hover:border-green-500'
                    }`}>
                    {rem.is_done && <i className="fas fa-check text-[10px]"></i>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${rem.is_done ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {rem.note || 'Follow up'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] ${isOverdue(rem.reminder_date) && !rem.is_done ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                        {formatDate(rem.reminder_date)}
                      </span>
                      {rem.cadence !== 'once' && (
                        <span className="text-[10px] text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">{rem.cadence}</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => deleteReminder(rem.id)}
                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i className="fas fa-trash text-xs"></i>
                  </button>
                </div>
              ))}
              {(!contact.reminders || contact.reminders.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-4">No reminders</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Number Picker */}
      {showWhatsAppPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowWhatsAppPicker(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
              <i className="fab fa-whatsapp text-[#25D366] mr-2"></i>Select Number
            </h3>
            <p className="text-xs text-gray-500 mb-4">Choose which number to message on WhatsApp</p>
            <div className="space-y-2">
              {getWhatsAppNumbers().map((n, i) => (
                <button key={i} onClick={() => openWhatsApp(n.number)}
                  className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 border-2 border-transparent transition-all text-left">
                  <div className="w-10 h-10 bg-[#25D366]/10 rounded-full flex items-center justify-center">
                    <i className="fab fa-whatsapp text-[#25D366] text-lg"></i>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{n.number}</p>
                    <p className="text-[10px] text-gray-400 uppercase">{n.label}</p>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowWhatsAppPicker(false)}
              className="w-full mt-3 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
          <button onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300">
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
