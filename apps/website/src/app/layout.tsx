import React from 'react';
import type { Metadata } from 'next';
import './globals.css';

// Google fonts download is bypassed for offline build support
const inter = { className: 'font-sans' };

export const metadata: Metadata = {
  title: 'Welcome to School ERP v1',
  description: 'Nursery to Class 12 Public Portal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
