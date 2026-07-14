import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  icon?: LucideIcon;
  iconBgColor?: string;
  iconTextColor?: string;
}

interface TimelineProps {
  events: TimelineEvent[];
}

export function Timeline({ events }: TimelineProps) {
  return (
    <div className="relative border-l border-slate-200 ml-3 pl-6 space-y-6 text-xs font-semibold">
      {events.map((event) => {
        const Icon = event.icon;
        return (
          <div key={event.id} className="relative">
            {/* Timeline dot */}
            <span className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-4 ring-slate-100">
              {Icon ? (
                <div className={`p-0.5 rounded-full ${event.iconBgColor || 'bg-primary/10'} ${event.iconTextColor || 'text-primary'}`}>
                  <Icon className="h-2.5 w-2.5" />
                </div>
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              )}
            </span>
            <div className="space-y-1">
              <div className="flex justify-between items-start gap-4">
                <span className="font-bold text-slate-800">{event.title}</span>
                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{event.timestamp}</span>
              </div>
              <p className="text-slate-500 font-medium leading-relaxed">{event.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
export default Timeline;
