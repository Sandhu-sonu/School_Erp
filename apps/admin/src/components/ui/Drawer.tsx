'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Drawer({ isOpen, onClose, title, children }: DrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />
      <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-100 flex flex-col relative z-10 animate-in slide-in-from-right duration-250">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">{title}</h4>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-450 hover:text-slate-750 transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
export default Drawer;
