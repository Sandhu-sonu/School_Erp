'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Bell, Plus, Calendar, Megaphone, CheckCircle2, Archive, Trash2, Search, Send, Clock, UserCheck } from 'lucide-react';

interface Notice {
  id: string;
  title: string;
  description: string;
  targetRole?: string | null;
  targetClass?: string | null;
  publishDate?: string | null;
  expiryDate?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'EXPIRED' | 'ARCHIVED';
  createdAt: string;
}

export default function CommunicationsPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isPrincipal = userRole === 'PRINCIPAL';

  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'PUBLISHED' | 'DRAFT' | 'EXPIRED' | 'ARCHIVED'>('PUBLISHED');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [targetClass, setTargetClass] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  useEffect(() => {
    fetchNotices();
  }, [selectedStatus, searchQuery]);

  const fetchNotices = async () => {
    setLoading(true);
    setError('');
    try {
      let url = '/api/communications';
      if (isPrincipal) {
        const params = new URLSearchParams();
        params.append('status', selectedStatus);
        if (searchQuery) params.append('search', searchQuery);
        url += `?${params.toString()}`;
      } else {
        if (searchQuery) url += `?search=${encodeURIComponent(searchQuery)}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch notices');
      const data = await res.json();
      setNotices(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const body = {
      id: editingNotice?.id,
      title,
      description,
      targetRole: targetRole || null,
      targetClass: targetClass || null,
      expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
    };

    try {
      const method = editingNotice ? 'PUT' : 'POST';
      const res = await fetch('/api/communications', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save notice');
      }

      setSuccess(editingNotice ? 'Notice updated successfully!' : 'Notice draft created successfully!');
      resetForm();
      await fetchNotices();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePublish = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/communications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'publish' }),
      });

      if (!res.ok) throw new Error('Failed to publish notice');
      setSuccess('Notice published successfully!');
      await fetchNotices();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to archive this notice?')) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/communications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'archive' }),
      });

      if (!res.ok) throw new Error('Failed to archive notice');
      setSuccess('Notice archived successfully!');
      await fetchNotices();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this notice?')) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/communications?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete notice');
      setSuccess('Notice deleted successfully!');
      await fetchNotices();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openEdit = (notice: Notice) => {
    setEditingNotice(notice);
    setTitle(notice.title);
    setDescription(notice.description);
    setTargetRole(notice.targetRole || '');
    setTargetClass(notice.targetClass || '');
    setExpiryDate(notice.expiryDate ? notice.expiryDate.split('T')[0] : '');
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingNotice(null);
    setTitle('');
    setDescription('');
    setTargetRole('');
    setTargetClass('');
    setExpiryDate('');
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Notice Board & Announcements</h1>
          <p className="text-xs text-slate-500">School-wide notification center. View or publish announcements.</p>
        </div>
        {isPrincipal && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
          >
            <Plus className="h-4 w-4" /> Create Notice
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded text-xs flex items-center gap-1.5 font-semibold">
          <CheckCircle2 className="h-4 w-4" /> {success}
        </div>
      )}

      {/* Principal tabs */}
      {isPrincipal && (
        <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold text-slate-500 mb-2">
          {(['PUBLISHED', 'DRAFT', 'EXPIRED', 'ARCHIVED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`pb-2 border-b-2 px-1 ${
                selectedStatus === status ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent hover:text-slate-700'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      )}

      {/* Search Filter */}
      <div className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search notice by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="erp-input w-full pl-9"
          />
        </div>
      </div>

      {/* Notice List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-xs">Loading notices...</div>
      ) : notices.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs bg-white">
          No notices found.
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => (
            <div key={notice.id} className="erp-card space-y-3 border-l-4 border-l-blue-600">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-blue-600 shrink-0" />
                    {notice.title}
                  </h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400 font-medium mt-1">
                    {notice.publishDate && (
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Published: {new Date(notice.publishDate).toLocaleDateString()}</span>
                    )}
                    {notice.expiryDate && (
                      <span className="flex items-center gap-1 text-amber-600"><Calendar className="h-3 w-3" /> Expires: {new Date(notice.expiryDate).toLocaleDateString()}</span>
                    )}
                    {notice.targetRole && (
                      <span className="flex items-center gap-1 text-indigo-600"><UserCheck className="h-3 w-3" /> Target: {notice.targetRole}</span>
                    )}
                    {notice.targetClass && (
                      <span className="flex items-center gap-1 text-violet-600">Class: {notice.targetClass}</span>
                    )}
                  </div>
                </div>

                {isPrincipal && (
                  <div className="flex items-center gap-1.5">
                    {notice.status === 'DRAFT' && (
                      <button
                        onClick={() => handlePublish(notice.id)}
                        className="px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 text-[10px] font-bold rounded flex items-center gap-1 border border-green-200"
                        title="Publish Draft"
                      >
                        <Send className="h-3 w-3" /> Publish
                      </button>
                    )}
                    {notice.status !== 'ARCHIVED' && (
                      <button
                        onClick={() => handleArchive(notice.id)}
                        className="p-1 text-slate-400 hover:text-amber-600 rounded hover:bg-slate-50"
                        title="Archive Notice"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(notice)}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-50"
                      title="Edit Notice"
                    >
                      <Plus className="h-3.5 w-3.5 rotate-45" /> {/* Edit icon placeholder */}
                    </button>
                    <button
                      onClick={() => handleDelete(notice.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-slate-50"
                      title="Delete Notice"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">{notice.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && isPrincipal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <form onSubmit={handleSaveNotice} className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2">
              {editingNotice ? 'Edit Notice' : 'Create New Announcement'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Sports Meet 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="erp-input w-full"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Type the announcement details here..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="erp-input w-full resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Target Role</label>
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="erp-input w-full"
                  >
                    <option value="">All Roles</option>
                    <option value="TEACHER">Teachers</option>
                    <option value="CLERK">Clerks</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Target Class</label>
                  <input
                    type="text"
                    placeholder="e.g. Class 10 (Optional)"
                    value={targetClass}
                    onChange={(e) => setTargetClass(e.target.value)}
                    className="erp-input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="erp-input w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1.5 border rounded text-xs text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
              >
                {editingNotice ? 'Update Notice' : 'Create Draft'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
