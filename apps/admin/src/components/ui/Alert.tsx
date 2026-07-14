import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

interface AlertProps {
  type?: 'success' | 'warning' | 'danger' | 'info';
  title?: string;
  message: string;
  className?: string;
}

export function Alert({ type = 'info', title, message, className = '' }: AlertProps) {
  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const icons = {
    success: CheckCircle2,
    warning: AlertTriangle,
    danger: AlertCircle,
    info: Info
  };

  const Icon = icons[type];

  return (
    <div className={`p-4 border rounded-2xl flex gap-3 ${styles[type]} ${className}`}>
      <Icon className="h-5 w-5 shrink-0" />
      <div className="text-xs space-y-0.5 font-semibold">
        {title && <h5 className="font-bold">{title}</h5>}
        <p>{message}</p>
      </div>
    </div>
  );
}
export default Alert;
