'use client';

import React, { useEffect, useState } from 'react';
import { X, CheckCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  subMessage?: string;
  actionText?: string;
  onAction?: () => void;
  onClose?: () => void;
  duration?: number;
}

export function Toast({
  message,
  subMessage,
  actionText,
  onAction,
  onClose,
  duration = 5000
}: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-slate-200 shadow-2xl p-4 rounded-2xl max-w-sm flex gap-3 z-50 animate-in slide-in-from-bottom duration-250">
      <div className="p-1 text-green-600 bg-green-50 rounded-xl h-fit">
        <CheckCircle className="h-5 w-5" />
      </div>
      <div className="text-xs space-y-1 font-semibold flex-1">
        <h5 className="font-bold text-slate-800">{message}</h5>
        {subMessage && <p className="text-slate-450">{subMessage}</p>}
        {actionText && onAction && (
          <button
            onClick={onAction}
            className="text-primary font-bold hover:underline block pt-1 text-[10px] uppercase tracking-wide"
          >
            {actionText}
          </button>
        )}
      </div>
      <button 
        onClick={() => { setVisible(false); if (onClose) onClose(); }}
        className="p-1 hover:bg-slate-50 rounded-lg text-slate-400"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
export default Toast;
