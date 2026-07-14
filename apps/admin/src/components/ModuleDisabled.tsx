'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

interface ModuleDisabledProps {
  moduleName: string;
}

export default function ModuleDisabled({ moduleName }: ModuleDisabledProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] bg-slate-50 p-6 text-center">
      <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6 border border-red-100 shadow-sm animate-pulse">
        <AlertTriangle className="h-8 w-8" />
      </div>
      
      <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">
        {moduleName} Module
      </h1>
      
      <p className="text-slate-500 max-w-md text-sm leading-relaxed mb-8">
        This module has been disabled by the School Administrator. 
        Contact your Principal if this module should be enabled.
      </p>

      <Link 
        href="/dashboard"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-sm hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Dashboard
      </Link>
    </div>
  );
}
