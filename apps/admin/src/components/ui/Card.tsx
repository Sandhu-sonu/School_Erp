import React from 'react';
import { LucideIcon } from 'lucide-react';

interface CardProps {
  children?: React.ReactNode;
  title?: string;
  className?: string;
  headerAction?: React.ReactNode;
}

export function Card({ children, title, className = '', headerAction }: CardProps) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl shadow-sm p-4 hover-card-effect ${className}`}>
      {(title || headerAction) && (
        <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-3">
          {title && <h3 className="text-xs font-bold text-slate-700">{title}</h3>}
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

interface StatisticCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconBgColor?: string;
  iconTextColor?: string;
  trend?: {
    value: string | number;
    isUp: boolean;
  };
  description?: string;
  className?: string;
}

export function StatisticCard({
  title,
  value,
  icon: Icon,
  iconBgColor = 'bg-primary/10',
  iconTextColor = 'text-primary',
  trend,
  description,
  className = ''
}: StatisticCardProps) {
  return (
    <div className={`p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover-card-effect flex flex-col justify-between ${className}`}>
      <div className="flex justify-between items-start">
        <div>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</span>
          <span className="text-xl font-extrabold text-slate-800 mt-1 block">{value}</span>
        </div>
        <div className={`p-2.5 rounded-xl ${iconBgColor} ${iconTextColor}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {(trend || description) && (
        <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-50 text-[10px] font-bold">
          {trend && (
            <span className={`px-1.5 py-0.5 rounded-full ${
              trend.isUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-750'
            }`}>
              {trend.isUp ? '↑' : '↓'} {trend.value}
            </span>
          )}
          {description && <span className="text-slate-400 font-semibold">{description}</span>}
        </div>
      )}
    </div>
  );
}

export default Card;
