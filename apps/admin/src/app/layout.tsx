import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
// Google fonts download is bypassed for offline build support
const inter = { className: 'font-sans' };

export const metadata: Metadata = {
  title: 'School ERP v1',
  description: 'Enterprise ERP for Nursery to Class 12 institutions',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ParentPortal'
  }
};

import { CommandPalette } from '@/components/CommandPalette';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-50" suppressHydrationWarning>
      <body className={`${inter.className} h-full antialiased text-slate-900`} suppressHydrationWarning>
        <Providers>
          {children}
          <CommandPalette />
        </Providers>
      </body>
    </html>
  );
}
