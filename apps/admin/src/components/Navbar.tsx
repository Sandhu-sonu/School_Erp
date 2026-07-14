'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Sun, Moon, Laptop, Search, Sparkles } from 'lucide-react';
import { useTheme } from './ThemeContext';

export function Navbar({ userName, userRole }: { userName?: string; userRole?: string }) {
  const { theme, brandColor, setTheme, setBrandColor } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [schoolName, setSchoolName] = useState('Greenwood High School');
  const [board, setBoard] = useState('CBSE Affiliation');

  // Load school details from db
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/system/school-settings');
        if (res.ok) {
          const data = await res.json();
          if (data.schoolName) {
            setSchoolName(data.schoolName);
            setBoard(`${data.board} Board`);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSettings();
  }, []);

  const notifications = [
    { id: '1', title: 'Fee Collection', desc: '₹15,000 payment received for REC-TEST-AAAA.', time: '10 mins ago', type: 'fees' },
    { id: '2', title: 'Backup Status', desc: 'Auto system backup archive completed successfully.', time: '1 hour ago', type: 'backups' },
    { id: '3', title: 'Examination Results', desc: 'Midterm Term 1 grade cards published for Class 10.', time: '2 hours ago', type: 'results' },
    { id: '4', title: 'Admissions Desk', desc: 'New student registration submitted (Adm: Aarav Kumar).', time: 'Yesterday', type: 'admissions' }
  ];

  const colors: Array<{ name: 'blue' | 'green' | 'purple' | 'red' | 'orange'; class: string }> = [
    { name: 'blue', class: 'bg-blue-600' },
    { name: 'green', class: 'bg-green-600' },
    { name: 'purple', class: 'bg-purple-600' },
    { name: 'red', class: 'bg-red-650' },
    { name: 'orange', class: 'bg-orange-500' }
  ];

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm">
      {/* Brand specs */}
      <div className="flex items-center gap-2">
        <div className="bg-primary text-white p-1 rounded-xl shadow">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">{schoolName}</h2>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{board} | Session 2026–27</span>
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="flex-1 max-w-sm mx-6 hidden md:block">
        <div 
          onClick={() => {
            // Trigger Ctrl+K Command Palette programmatically by firing keyboard event
            const event = new KeyboardEvent('keydown', { ctrlKey: true, key: 'k' });
            window.dispatchEvent(event);
          }}
          className="relative cursor-pointer w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-350 transition-all rounded-xl text-left text-slate-400 text-xs font-semibold shadow-inner select-none flex items-center"
        >
          <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-slate-400" />
          <span>Search records... (Ctrl + K)</span>
        </div>
      </div>

      {/* System utility togglers */}
      <div className="flex items-center gap-4 text-slate-500 relative">
        {/* Color Palette selector */}
        <div className="relative">
          <button 
            onClick={() => { setShowThemeSelector(!showThemeSelector); setShowNotifications(false); }}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors relative"
            title="Theme Branding"
          >
            <span className={`w-3 h-3 rounded-full block border border-white ${
              brandColor === 'blue' ? 'bg-blue-600' :
              brandColor === 'green' ? 'bg-green-600' :
              brandColor === 'purple' ? 'bg-purple-600' :
              brandColor === 'red' ? 'bg-red-650' : 'bg-orange-500'
            }`} />
          </button>

          {showThemeSelector && (
            <div className="absolute right-0 top-12 bg-white border border-slate-200 shadow-2xl p-4 rounded-2xl w-48 z-30 space-y-3">
              <h5 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider border-b border-slate-100 pb-1">Select Branding</h5>
              <div className="flex gap-2.5">
                {colors.map(c => (
                  <button
                    key={c.name}
                    onClick={() => { setBrandColor(c.name); setShowThemeSelector(false); }}
                    className={`w-5 h-5 rounded-full ${c.class} hover:scale-110 transition-transform border-2 ${
                      brandColor === c.name ? 'border-slate-800 ring-2 ring-primary/20' : 'border-transparent'
                    }`}
                  />
                ))}
              </div>

              <h5 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider border-b border-slate-100 pb-1 pt-1">Theme Mode</h5>
              <div className="flex justify-between gap-1 text-[10px] font-bold uppercase tracking-wider">
                <button 
                  onClick={() => { setTheme('light'); setShowThemeSelector(false); }}
                  className={`flex-1 py-1 px-1.5 rounded flex items-center justify-center gap-1 border ${
                    theme === 'light' ? 'bg-slate-100 border-slate-250' : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <Sun className="h-3 w-3" />
                  Light
                </button>
                <button 
                  onClick={() => { setTheme('dark'); setShowThemeSelector(false); }}
                  className={`flex-1 py-1 px-1.5 rounded flex items-center justify-center gap-1 border ${
                    theme === 'dark' ? 'bg-slate-100 border-slate-250' : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <Moon className="h-3 w-3" />
                  Dark
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notifications Center */}
        <div className="relative">
          <button 
            onClick={() => { setShowNotifications(!showNotifications); setShowThemeSelector(false); }}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors relative"
            title="Notification Center"
          >
            <Bell className="h-4.5 w-4.5 text-slate-500" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-600 rounded-full ring-2 ring-white animate-pulse" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 bg-white border border-slate-200 shadow-2xl rounded-2xl w-72 z-30 overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <h5 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider">Notification Center</h5>
                <span className="text-[9px] font-bold bg-blue-150 text-blue-800 px-1.5 py-0.2 rounded-full">4 NEW</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[250px] overflow-y-auto">
                {notifications.map(n => (
                  <div key={n.id} className="p-3 hover:bg-slate-50/50 transition-colors text-left space-y-0.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-800">{n.title}</span>
                      <span className="text-[9px] text-slate-400 font-medium">{n.time}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
export default Navbar;
