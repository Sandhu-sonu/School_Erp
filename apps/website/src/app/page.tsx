import React from 'react';
import { prisma } from '@school-erp/db';

export const dynamic = 'force-dynamic';

export default async function PublicHomePage() {
  const notices = await prisma.notice.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [
        { expiryDate: null },
        { expiryDate: { gte: new Date() } },
      ],
    },
    orderBy: { publishDate: 'desc' },
    take: 5
  });

  const galleryItems = await prisma.galleryItem.findMany({
    orderBy: { createdAt: 'desc' },
    take: 6
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Hero section */}
      <header className="bg-slate-900 text-white py-12 px-6 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">School ERP v1 Public Portal</h1>
        <p className="mt-3 max-w-md mx-auto text-sm text-slate-300">
          Providing high quality education from Nursery to Class 12.
        </p>
      </header>

      {/* Main content grid */}
      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
        {/* About & Contact */}
        <section className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 border border-slate-200 rounded shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 border-b pb-2 mb-3">About Our Institution</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Welcome to our premier school. We are dedicated to nurturing and educating children from Nursery through Class 12, focusing on academic excellence, personal growth, and social responsibility.
            </p>
          </div>

          <div className="bg-white p-6 border border-slate-200 rounded shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 border-b pb-2 mb-3">Contact & Inquiry</h2>
            <p className="text-sm text-slate-600 mb-4">
              Have questions or want to inquire about admissions? Get in touch with our office.
            </p>
            <div className="space-y-2 text-xs">
              <p><strong>Address:</strong> 123 Education Lane, Learning Center</p>
              <p><strong>Phone:</strong> +1 (555) 019-2834</p>
              <p><strong>Email:</strong> office@school.erp</p>
            </div>
          </div>
        </section>

        {/* Sidebar: Notices */}
        <aside className="space-y-6">
          <div className="bg-white p-6 border border-slate-200 rounded shadow-sm">
            <h2 className="text-sm font-bold uppercase text-slate-500 tracking-wider border-b pb-2 mb-3">Notice Board</h2>
            {notices.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No active notices.</p>
            ) : (
              <div className="space-y-3">
                {notices.map((notice) => (
                  <div key={notice.id} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                    <h3 className="text-xs font-semibold text-slate-800">{notice.title}</h3>
                    <p className="text-[11px] text-slate-600 mt-1">{notice.description}</p>
                    <span className="text-[9px] text-slate-400 block mt-1">
                      {notice.publishDate ? new Date(notice.publishDate).toLocaleDateString() : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-6 border border-slate-200 rounded shadow-sm">
            <h2 className="text-sm font-bold uppercase text-slate-500 tracking-wider border-b pb-2 mb-3">Photo Gallery</h2>
            {galleryItems.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No photos posted.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {galleryItems.map((item) => (
                  <div key={item.id} className="border border-slate-100 rounded overflow-hidden" title={item.title}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.imageUrl} alt={item.title} className="w-full h-16 object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-4 px-6 text-center text-xs border-t border-slate-800">
        &copy; {new Date().getFullYear()} School ERP v1. All rights reserved.
      </footer>
    </div>
  );
}
