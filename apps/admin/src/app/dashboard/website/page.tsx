'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Globe, FileText, Image as ImageIcon, ExternalLink, AlertCircle } from 'lucide-react';

export default function WebsiteConsolePage() {
  const [activeTab, setActiveTab] = useState<'notices' | 'gallery' | 'preview'>('notices');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Public Website Administration</h1>
          <p className="text-xs text-slate-500">Manage notices, announcement boards, photo galleries, and preview public portal configurations.</p>
        </div>
        <Link
          href="/"
          target="_blank"
          className="erp-btn-secondary text-xs flex items-center gap-1.5 font-semibold"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Launch Public Portal</span>
        </Link>
      </div>

      <div className="erp-card bg-blue-50/50 border-blue-200 p-4 flex gap-3 items-start">
        <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider">Future Expansion Notice</h4>
          <p className="text-xs text-blue-700 mt-1">
            This module controls content publishing schedules for notices and announcements. Additional widgets and full CMS layout template controls will be added in future versions.
          </p>
        </div>
      </div>

      {/* Tabs selector */}
      <div className="border-b border-slate-200 flex gap-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('notices')}
          className={`pb-2 border-b-2 transition-colors ${activeTab === 'notices' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-slate-800'}`}
        >
          Notices & News
        </button>
        <button
          onClick={() => setActiveTab('gallery')}
          className={`pb-2 border-b-2 transition-colors ${activeTab === 'gallery' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-slate-800'}`}
        >
          Photo Gallery
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`pb-2 border-b-2 transition-colors ${activeTab === 'preview' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-slate-800'}`}
        >
          Live Preview
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'notices' && (
        <div className="erp-card p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-slate-400" />
              Notices Board Manager
            </h3>
            <Link href="/dashboard/communications" className="erp-btn-primary text-xs font-semibold">
              Manage Notices
            </Link>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Notices published via the Communications Notice Board module are automatically displayed on the public landing page if status is set to <strong>PUBLISHED</strong> and the expiry date is valid.
          </p>
        </div>
      )}

      {activeTab === 'gallery' && (
        <div className="erp-card p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4 text-slate-400" />
              Gallery Manager
            </h3>
            <Link href="/dashboard/website/gallery" className="erp-btn-primary text-xs font-semibold">
              Open Gallery Console
            </Link>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Upload institutional highlights, event photographs, and achievements. JPG, PNG, and WEBP formats under 2MB are optimized automatically for public access.
          </p>
        </div>
      )}

      {activeTab === 'preview' && (
        <div className="erp-card p-0 overflow-hidden border border-slate-300 rounded shadow">
          <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex items-center gap-2 text-xs font-mono text-slate-500">
            <Globe className="h-4 w-4" />
            <span>http://school-erp-v1/public-portal</span>
          </div>
          <iframe
            src="/"
            className="w-full h-[500px] border-0"
            title="Public Website Preview"
          />
        </div>
      )}
    </div>
  );
}
