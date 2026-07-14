'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Calendar, MapPin, Clock, Info } from 'lucide-react';

interface EventDetail {
  id: string;
  title: string;
  description: string;
  date: string;
}

export default function PortalCalendarPage() {
  const [events, setEvents] = useState<EventDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCalendar = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/portal/calendar');
        if (!res.ok) throw new Error('Failed to load school calendar.');
        const data = await res.json();
        setEvents(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCalendar();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5 select-none pb-4">
      {/* Page Header */}
      <div>
        <h2 className="text-sm font-bold text-slate-800">School Calendar & Events</h2>
        <p className="text-[10px] text-slate-500">Track upcoming holidays, examinations schedules, and parent-teacher meetings.</p>
      </div>

      {/* Events Timeline */}
      {events.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <Calendar className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700">No Events Configured</h3>
          <p className="text-xs text-slate-450 mt-1">There are no upcoming calendar events or holiday declarations posted.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((e) => {
            const eventDate = new Date(e.date);
            const isHoliday = e.title.toLowerCase().includes('holiday');
            
            return (
              <div 
                key={e.id} 
                className={`p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-350 transition-colors flex items-start gap-4 ${
                  isHoliday ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-blue-500'
                }`}
              >
                {/* Date indicator block */}
                <div className="flex flex-col items-center justify-center bg-slate-50 rounded-lg p-2 border border-slate-100 shrink-0 min-w-[50px]">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    {eventDate.toLocaleString('en-US', { month: 'short' })}
                  </span>
                  <span className="text-base font-extrabold text-slate-800 leading-none mt-0.5">
                    {eventDate.getDate()}
                  </span>
                </div>

                {/* Event info */}
                <div className="min-w-0 flex-1">
                  <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${
                    isHoliday ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {isHoliday ? 'Holiday / Break' : 'Academic Event'}
                  </span>
                  <h4 className="text-xs font-bold text-slate-800 mt-1 leading-snug">{e.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{e.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
