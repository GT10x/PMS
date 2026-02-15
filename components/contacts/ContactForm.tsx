'use client';

import { useState } from 'react';
import TagManager from './TagManager';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface ContactFormProps {
  contact?: any;
  allTags: Tag[];
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  onCreateTag: (name: string, color: string) => Promise<Tag | null>;
}

export default function ContactForm({ contact, allTags, onSave, onCancel, onCreateTag }: ContactFormProps) {
  const [form, setForm] = useState({
    full_name: contact?.full_name || '',
    nickname: contact?.nickname || '',
    company: contact?.company || '',
    title: contact?.title || '',
    phones: contact?.phones || [{ type: 'mobile', number: '' }],
    emails: contact?.emails || [{ type: 'work', email: '' }],
    profile_photo_url: contact?.profile_photo_url || '',
    met_at_event: contact?.met_at_event || '',
    met_at_location: contact?.met_at_location || '',
    met_at_date: contact?.met_at_date || '',
    introduced_by: contact?.introduced_by || '',
    birthday: contact?.birthday || '',
    anniversary: contact?.anniversary || '',
    linkedin: contact?.linkedin || '',
    twitter: contact?.twitter || '',
    instagram: contact?.instagram || '',
    whatsapp: contact?.whatsapp || '',
    website: contact?.website || '',
    address: contact?.address || '',
    is_favorite: contact?.is_favorite || false,
  });
  const [tagIds, setTagIds] = useState<string[]>(contact?.tags?.map((t: any) => t.id) || []);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const update = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  const addPhone = () => update('phones', [...form.phones, { type: 'mobile', number: '' }]);
  const removePhone = (i: number) => update('phones', form.phones.filter((_: any, idx: number) => idx !== i));
  const updatePhone = (i: number, field: string, value: string) => {
    const phones = [...form.phones];
    phones[i] = { ...phones[i], [field]: value };
    update('phones', phones);
  };

  const addEmail = () => update('emails', [...form.emails, { type: 'work', email: '' }]);
  const removeEmail = (i: number) => update('emails', form.emails.filter((_: any, idx: number) => idx !== i));
  const updateEmail = (i: number, field: string, value: string) => {
    const emails = [...form.emails];
    emails[i] = { ...emails[i], [field]: value };
    update('emails', emails);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      update('profile_photo_url', data.url);
    } catch {
      alert('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.full_name.trim()) { alert('Name is required'); return; }
    setSaving(true);
    // Clean empty phones/emails
    const cleanPhones = form.phones.filter((p: any) => p.number.trim());
    const cleanEmails = form.emails.filter((e: any) => e.email.trim());
    await onSave({ ...form, phones: cleanPhones, emails: cleanEmails, tagIds });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Profile Photo */}
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
          {form.profile_photo_url ? (
            <img src={form.profile_photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <i className="fas fa-user text-3xl text-gray-400"></i>
          )}
        </div>
        <label className="cursor-pointer px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
          {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
        </label>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
          <input type="text" value={form.full_name} onChange={e => update('full_name', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nickname</label>
          <input type="text" value={form.nickname} onChange={e => update('nickname', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company</label>
          <input type="text" value={form.company} onChange={e => update('company', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title / Designation</label>
          <input type="text" value={form.title} onChange={e => update('title', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
        </div>
      </div>

      {/* Phones */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Numbers</label>
        {form.phones.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <select value={p.type} onChange={e => updatePhone(i, 'type', e.target.value)}
              className="px-2 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white w-28">
              <option value="mobile">Mobile</option>
              <option value="work">Work</option>
              <option value="home">Home</option>
              <option value="other">Other</option>
            </select>
            <input type="tel" value={p.number} onChange={e => updatePhone(i, 'number', e.target.value)}
              placeholder="+91 98765 43210" className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
            {form.phones.length > 1 && (
              <button onClick={() => removePhone(i)} className="text-red-500 hover:text-red-700 p-2"><i className="fas fa-times"></i></button>
            )}
          </div>
        ))}
        <button onClick={addPhone} className="text-sm text-indigo-500 hover:text-indigo-700"><i className="fas fa-plus mr-1"></i>Add Phone</button>
      </div>

      {/* Emails */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Addresses</label>
        {form.emails.map((e: any, i: number) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <select value={e.type} onChange={ev => updateEmail(i, 'type', ev.target.value)}
              className="px-2 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white w-28">
              <option value="work">Work</option>
              <option value="personal">Personal</option>
              <option value="other">Other</option>
            </select>
            <input type="email" value={e.email} onChange={ev => updateEmail(i, 'email', ev.target.value)}
              placeholder="email@example.com" className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
            {form.emails.length > 1 && (
              <button onClick={() => removeEmail(i)} className="text-red-500 hover:text-red-700 p-2"><i className="fas fa-times"></i></button>
            )}
          </div>
        ))}
        <button onClick={addEmail} className="text-sm text-indigo-500 hover:text-indigo-700"><i className="fas fa-plus mr-1"></i>Add Email</button>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags</label>
        <TagManager allTags={allTags} selectedTagIds={tagIds} onTagsChange={setTagIds} onCreateTag={onCreateTag} />
      </div>

      {/* How We Met */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          <i className="fas fa-handshake mr-2 text-indigo-500"></i>How / Where We Met
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Event / Occasion</label>
            <input type="text" value={form.met_at_event} onChange={e => update('met_at_event', e.target.value)}
              placeholder="e.g. Tech Conference 2026" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Location</label>
            <input type="text" value={form.met_at_location} onChange={e => update('met_at_location', e.target.value)}
              placeholder="e.g. Mumbai" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date Met</label>
            <input type="date" value={form.met_at_date} onChange={e => update('met_at_date', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Introduced By</label>
            <input type="text" value={form.introduced_by} onChange={e => update('introduced_by', e.target.value)}
              placeholder="e.g. Rajesh Patel" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm" />
          </div>
        </div>
      </div>

      {/* Important Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Birthday</label>
          <input type="date" value={form.birthday} onChange={e => update('birthday', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Anniversary</label>
          <input type="date" value={form.anniversary} onChange={e => update('anniversary', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
        </div>
      </div>

      {/* Social */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          <i className="fas fa-share-alt mr-2 text-indigo-500"></i>Social Links
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <i className="fab fa-linkedin text-blue-600 w-5"></i>
            <input type="text" value={form.linkedin} onChange={e => update('linkedin', e.target.value)}
              placeholder="LinkedIn URL" className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <i className="fab fa-whatsapp text-green-500 w-5"></i>
            <input type="text" value={form.whatsapp} onChange={e => update('whatsapp', e.target.value)}
              placeholder="WhatsApp number" className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <i className="fab fa-instagram text-pink-500 w-5"></i>
            <input type="text" value={form.instagram} onChange={e => update('instagram', e.target.value)}
              placeholder="Instagram handle" className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <i className="fas fa-globe text-gray-500 w-5"></i>
            <input type="text" value={form.website} onChange={e => update('website', e.target.value)}
              placeholder="Website URL" className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm" />
          </div>
        </div>
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
        <textarea value={form.address} onChange={e => update('address', e.target.value)}
          rows={2} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      </div>

      {/* Favorite */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.is_favorite} onChange={e => update('is_favorite', e.target.checked)}
          className="w-4 h-4 text-yellow-500" />
        <span className="text-sm text-gray-700 dark:text-gray-300"><i className="fas fa-star text-yellow-500 mr-1"></i>Mark as Favorite</span>
      </label>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t dark:border-gray-700">
        <button onClick={handleSubmit} disabled={saving}
          className="px-6 py-2.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 font-medium">
          {saving ? 'Saving...' : contact ? 'Update Contact' : 'Create Contact'}
        </button>
        <button onClick={onCancel} className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
          Cancel
        </button>
      </div>
    </div>
  );
}
