'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import Breadcrumb from '@/components/Breadcrumb';
import ContactForm from '@/components/contacts/ContactForm';
import BusinessCardScanner from '@/components/contacts/BusinessCardScanner';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Contact {
  id: string;
  full_name: string;
  nickname: string | null;
  company: string | null;
  title: string | null;
  phones: { type: string; number: string }[];
  emails: { type: string; email: string }[];
  profile_photo_url: string | null;
  is_favorite: boolean;
  tags: Tag[];
  latest_remark: { content: string; created_at: string } | null;
  overdue_reminders: number;
}

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanPrefill, setScanPrefill] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchContacts();
    fetchTags();
  }, []);

  const fetchContacts = async (s?: string, tag?: string, fav?: boolean) => {
    const params = new URLSearchParams();
    if (s || search) params.set('search', s ?? search);
    if (tag || filterTag) params.set('tagId', tag ?? filterTag);
    if (fav ?? filterFavorite) params.set('favorite', 'true');

    const res = await fetch(`/api/contacts?${params}`);
    if (res.status === 403) { router.push('/dashboard'); return; }
    if (res.ok) {
      const data = await res.json();
      setContacts(data.contacts || []);
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

  const handleSearch = (val: string) => {
    setSearch(val);
    fetchContacts(val, filterTag, filterFavorite);
  };

  const handleTagFilter = (tagId: string) => {
    const newTag = filterTag === tagId ? '' : tagId;
    setFilterTag(newTag);
    fetchContacts(search, newTag, filterFavorite);
  };

  const handleFavoriteFilter = () => {
    const newFav = !filterFavorite;
    setFilterFavorite(newFav);
    fetchContacts(search, filterTag, newFav);
  };

  const handleSave = async (data: any) => {
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setShowForm(false);
      setScanPrefill(null);
      fetchContacts();
    }
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

  const toggleFavorite = async (contact: Contact) => {
    await fetch(`/api/contacts/${contact.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: !contact.is_favorite }),
    });
    fetchContacts();
  };

  const handleScanResult = (data: any) => {
    setShowScanner(false);
    setScanPrefill(data);
    setShowForm(true);
  };

  const cleanNumber = (num: string) => {
    let digits = num.replace(/[^\d+]/g, '');
    if (digits.startsWith('0') && digits.length === 11) digits = '+91' + digits.substring(1);
    if (/^\d{10}$/.test(digits)) digits = '+91' + digits;
    return digits;
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  if (loading) {
    return (
      <DashboardLayout>
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Contacts' }]} />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard', icon: 'fas fa-home' }, { label: 'Contacts', icon: 'fas fa-address-book' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
            <i className="fas fa-address-book mr-2 text-indigo-500"></i>Contact Manager
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{contacts.length} contacts</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowScanner(true)}
            className="px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 text-sm font-medium">
            <i className="fas fa-id-card mr-2"></i>Scan Card
          </button>
          <button onClick={() => { setScanPrefill(null); setShowForm(true); }}
            className="px-4 py-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-sm font-medium">
            <i className="fas fa-plus mr-2"></i>Add Contact
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              type="text" value={search} onChange={e => handleSearch(e.target.value)}
              placeholder="Search by name, company, phone, email, or notes..."
              className="w-full pl-10 pr-4 py-2.5 border rounded-xl dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleFavoriteFilter}
              className={`px-3 py-2.5 rounded-xl text-sm transition-colors ${filterFavorite ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
              <i className={`fas fa-star mr-1 ${filterFavorite ? 'text-yellow-500' : ''}`}></i> Favorites
            </button>
            <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-sm">
              <i className={`fas ${viewMode === 'grid' ? 'fa-list' : 'fa-th'}`}></i>
            </button>
          </div>
        </div>

        {/* Tag chips */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {allTags.map(tag => (
              <button key={tag.id} onClick={() => handleTagFilter(tag.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  filterTag === tag.id ? 'ring-2 ring-offset-1 ring-gray-400' : 'opacity-70 hover:opacity-100'
                }`}
                style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                {tag.name}
              </button>
            ))}
            {filterTag && (
              <button onClick={() => handleTagFilter('')} className="text-xs text-gray-500 hover:text-red-500">
                <i className="fas fa-times mr-1"></i>Clear filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Contact Grid/List */}
      {contacts.length === 0 ? (
        <div className="card p-12 text-center">
          <i className="fas fa-address-book text-5xl text-gray-300 dark:text-gray-600 mb-4"></i>
          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">No contacts yet</h3>
          <p className="text-sm text-gray-400 mt-1">Add your first contact or scan a visiting card</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {contacts.map(contact => (
            <Link key={contact.id} href={`/dashboard/contacts/${contact.id}`}
              className="card p-4 hover:border-indigo-500 border-2 border-transparent transition-all group relative">
              {/* Overdue badge */}
              {contact.overdue_reminders > 0 && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {contact.overdue_reminders}
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {contact.profile_photo_url ? (
                    <img src={contact.profile_photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-semibold text-gray-500">{contact.full_name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <h3 className="font-semibold text-gray-800 dark:text-white truncate group-hover:text-indigo-500 transition-colors">
                      {contact.full_name}
                    </h3>
                    {contact.is_favorite && <i className="fas fa-star text-yellow-500 text-xs"></i>}
                  </div>
                  {contact.company && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{contact.title ? `${contact.title}, ` : ''}{contact.company}</p>}
                  {contact.phones[0] && <p className="text-xs text-gray-400 mt-1"><i className="fas fa-phone text-[10px] mr-1"></i>{contact.phones[0].number}</p>}
                </div>
                <button onClick={(e) => { e.preventDefault(); toggleFavorite(contact); }}
                  className="text-gray-300 hover:text-yellow-500 transition-colors">
                  <i className={`${contact.is_favorite ? 'fas' : 'far'} fa-star`}></i>
                </button>
              </div>

              {/* Quick actions: Call, WhatsApp */}
              {contact.phones.length > 0 && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t dark:border-gray-700">
                  <a href={`tel:${cleanNumber(contact.phones[0].number)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-xs hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
                    <i className="fas fa-phone text-[10px]"></i> Call
                  </a>
                  <a href={`https://wa.me/${cleanNumber(contact.phones[0].number).replace('+', '')}`}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#25D366]/10 text-[#25D366] rounded-lg text-xs hover:bg-[#25D366]/20 transition-colors">
                    <i className="fab fa-whatsapp"></i> WhatsApp
                  </a>
                  {contact.emails?.[0] && (
                    <a href={`mailto:${contact.emails[0].email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg text-xs hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                      <i className="fas fa-envelope text-[10px]"></i> Email
                    </a>
                  )}
                </div>
              )}

              {/* Tags */}
              {contact.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {contact.tags.slice(0, 3).map(tag => (
                    <span key={tag.id} className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                      {tag.name}
                    </span>
                  ))}
                  {contact.tags.length > 3 && <span className="text-[10px] text-gray-400">+{contact.tags.length - 3}</span>}
                </div>
              )}

              {/* Latest remark preview */}
              {contact.latest_remark?.content && (
                <p className="text-xs text-gray-400 mt-2 truncate italic">
                  &ldquo;{contact.latest_remark.content}&rdquo;
                  <span className="ml-1 text-[10px]">{formatDate(contact.latest_remark.created_at)}</span>
                </p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="card divide-y dark:divide-gray-700">
          {contacts.map(contact => (
            <Link key={contact.id} href={`/dashboard/contacts/${contact.id}`}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative">
              {contact.overdue_reminders > 0 && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {contact.overdue_reminders}
                </div>
              )}
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                {contact.profile_photo_url ? (
                  <img src={contact.profile_photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-semibold text-gray-500">{contact.full_name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800 dark:text-white">{contact.full_name}</span>
                  {contact.is_favorite && <i className="fas fa-star text-yellow-500 text-xs"></i>}
                  {contact.tags.slice(0, 2).map(tag => (
                    <span key={tag.id} className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ backgroundColor: tag.color + '20', color: tag.color }}>{tag.name}</span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 truncate">{contact.company || ''} {contact.phones[0]?.number ? `| ${contact.phones[0].number}` : ''}</p>
              </div>
              {/* Quick actions: Call, WhatsApp, Email */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {contact.phones.length > 0 && (
                  <>
                    <a href={`tel:${cleanNumber(contact.phones[0].number)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 flex items-center justify-center bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                      title="Call">
                      <i className="fas fa-phone text-xs"></i>
                    </a>
                    <a href={`https://wa.me/${cleanNumber(contact.phones[0].number).replace('+', '')}`}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 flex items-center justify-center bg-[#25D366]/10 text-[#25D366] rounded-lg hover:bg-[#25D366]/20 transition-colors"
                      title="WhatsApp">
                      <i className="fab fa-whatsapp text-sm"></i>
                    </a>
                  </>
                )}
                {contact.emails?.[0] && (
                  <a href={`mailto:${contact.emails[0].email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="w-8 h-8 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    title="Email">
                    <i className="fas fa-envelope text-xs"></i>
                  </a>
                )}
              </div>
              {contact.latest_remark?.content && (
                <p className="text-xs text-gray-400 max-w-48 truncate hidden md:block italic">"{contact.latest_remark.content}"</p>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Add Contact Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full p-6 my-8">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              <i className="fas fa-user-plus mr-2 text-indigo-500"></i>
              {scanPrefill ? 'Review Scanned Contact' : 'Add New Contact'}
            </h2>
            <ContactForm
              contact={scanPrefill}
              allTags={allTags}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setScanPrefill(null); }}
              onCreateTag={handleCreateTag}
            />
          </div>
        </div>
      )}

      {/* Business Card Scanner */}
      {showScanner && (
        <BusinessCardScanner onResult={handleScanResult} onClose={() => setShowScanner(false)} />
      )}
    </DashboardLayout>
  );
}
