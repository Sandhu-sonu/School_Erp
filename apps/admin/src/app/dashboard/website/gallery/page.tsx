'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Trash2, Image as ImageIcon, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface GalleryItem {
  id: string;
  title: string;
  imageUrl: string;
  category: string | null;
  createdAt: string;
}

export default function GalleryManagerPage() {
  const { data: sessionData } = useSession();
  const userRole = sessionData?.user?.role;
  const isAuthorized = userRole === 'PRINCIPAL' || userRole === 'CLERK';

  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchGallery = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/website/gallery');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to fetch gallery items');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userRole) {
      fetchGallery();
    }
  }, [userRole]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    if (category) formData.append('category', category);

    try {
      const res = await fetch('/api/website/gallery', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setTitle('');
        setCategory('');
        setFile(null);
        // Reset file input element
        const fileInput = document.getElementById('gallery-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        await fetchGallery();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to upload photo');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this photo from the gallery?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/website/gallery?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchGallery();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to delete photo');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete photo');
    }
  };

  if (!isAuthorized && userRole) {
    return (
      <div className="erp-card p-8 text-center space-y-4 max-w-lg mx-auto mt-12 border-red-200 bg-red-50">
        <AlertCircle className="h-10 w-10 text-red-600 mx-auto" />
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Access Denied</h2>
        <p className="text-xs text-slate-600">Only Principals and Clerks can modify the public website gallery.</p>
        <Link href="/dashboard" className="erp-btn-secondary inline-block">Go to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <Link href="/dashboard/website" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mb-1">
            <ArrowLeft className="h-3 w-3" />
            Back to Website Console
          </Link>
          <h1 className="text-xl font-bold text-slate-800">Website Photo Gallery Manager</h1>
          <p className="text-xs text-slate-500">Upload school activities, facilities, and celebration photos to the public landing page.</p>
        </div>
        <button
          type="button"
          onClick={fetchGallery}
          className="erp-btn-secondary flex items-center gap-1 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Reload</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form */}
        <div className="erp-card h-fit">
          <h2 className="text-xs font-bold uppercase text-slate-700 border-b pb-2 mb-3 flex items-center gap-1.5">
            <Plus className="h-4 w-4 text-blue-600" />
            Upload New Photo
          </h2>
          <form onSubmit={handleUpload} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Photo Title</label>
              <input
                type="text"
                className="erp-input"
                placeholder="e.g. Annual Sports Day 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category (Optional)</label>
              <input
                type="text"
                className="erp-input"
                placeholder="e.g. Sports, Event, Campus"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select File (max 2MB)</label>
              <input
                id="gallery-file-input"
                type="file"
                accept="image/*"
                className="erp-input"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !file || !title}
              className="erp-btn-primary w-full text-xs font-semibold mt-2"
            >
              <span>{isSubmitting ? 'Uploading...' : 'Upload Image'}</span>
            </button>
          </form>
        </div>

        {/* Gallery items grid */}
        <div className="erp-card lg:col-span-2">
          <h2 className="text-xs font-bold uppercase text-slate-700 border-b pb-2 mb-3 flex items-center gap-1.5">
            <ImageIcon className="h-4 w-4 text-slate-500" />
            Current Gallery Items
          </h2>
          
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Loading photos...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs border border-dashed border-slate-200 rounded">
              No photos uploaded to the gallery yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {items.map((item) => (
                <div key={item.id} className="border border-slate-200 rounded overflow-hidden bg-slate-50 relative group flex flex-col justify-between">
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="object-cover w-full h-full"
                    />
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded shadow transition-opacity opacity-0 group-hover:opacity-100"
                      title="Delete Photo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="p-2 bg-white flex-1 flex flex-col justify-between">
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{item.title}</h4>
                    <div className="flex justify-between items-center mt-1 text-[9px] text-slate-500 font-semibold">
                      <span>{item.category || 'No Category'}</span>
                      <span className="font-mono">{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
