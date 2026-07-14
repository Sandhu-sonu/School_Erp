'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Home, Award, CreditCard, Calendar, User, LogOut, ChevronDown, Shield,
  Phone, Mail, MapPin, Globe, Star, Info, MessageSquare, AlertCircle, 
  CheckCircle, Search, Settings, ShieldCheck, Download, FileText, X, Bell
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  admissionNumber: string;
  photo: string | null;
  enrollments: Array<{
    class: { name: string };
    section: { name: string } | null;
  }>;
}

interface Parent {
  id: string;
  fatherName: string;
  motherName: string | null;
  mobile: string;
  address: string | null;
  students: Student[];
}

interface ParentNavWrapperProps {
  parent: Parent | null;
  children: React.ReactNode;
}

interface SchoolSettings {
  schoolName: string;
  address: string;
  board: string;
  principalName: string;
  phone: string;
  email: string;
  website: string | null;
  logoUrl: string | null;
}

export default function ParentNavWrapper({ parent, children }: ParentNavWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentStudentId = searchParams.get('studentId');

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  
  // UI states
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [activeMoreTab, setActiveMoreTab] = useState<'menu' | 'profile' | 'notifications' | 'downloads' | 'contact' | 'diagnostics'>('menu');
  const [diagnosticTaps, setDiagnosticTaps] = useState(0);
  const [language, setLanguage] = useState('English');
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'syncing'>('online');
  const [showOnlineStatus, setShowOnlineStatus] = useState(false);

  // Dynamic config states
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>({
    FINANCE: true,
    RESULTS: true,
    ATTENDANCE: true
  });

  const students = parent?.students || [];

  // 1. Fetch dynamic school config and feature toggles on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const [settingsRes, modulesRes] = await Promise.all([
          fetch('/api/system/school-settings'),
          fetch('/api/system/modules')
        ]);
        
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          setSchoolSettings(settings);
        }

        if (modulesRes.ok) {
          const rawModules = await modulesRes.json();
          const mapped: Record<string, boolean> = {};
          rawModules.forEach((m: any) => {
            mapped[m.moduleKey] = m.enabled;
          });
          setEnabledModules(mapped);
        }

        // Register Service Worker for offline capability
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/sw.js').then((reg) => {
            console.log('Service Worker registered successfully:', reg.scope);
          }).catch((err) => {
            console.error('Service Worker registration failed:', err);
          });
        }
      } catch (err) {
        console.error('Failed to load branding / module configs:', err);
      }
    }
    loadConfig();
  }, []);

  // 2. Monitor Network status changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setNetworkStatus('syncing');
      setTimeout(() => {
        setNetworkStatus('online');
        setShowOnlineStatus(true);
        setTimeout(() => setShowOnlineStatus(false), 3000);
      }, 1500);
    };

    const handleOffline = () => {
      setNetworkStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      setNetworkStatus('offline');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (students.length > 0) {
      if (!currentStudentId) {
        setSelectedStudentId(students[0].id);
        router.replace(`${pathname}?studentId=${students[0].id}`);
      } else {
        setSelectedStudentId(currentStudentId);
      }
    }
  }, [currentStudentId, students, pathname, router]);

  const handleStudentChange = (id: string) => {
    setSelectedStudentId(id);
    setDropdownOpen(false);
    router.push(`${pathname}?studentId=${id}`);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/portal/auth', { method: 'DELETE' });
      router.push('/portal/login');
    } catch (err) {
      console.error(err);
    } finally {
      setLoggingOut(false);
    }
  };

  const activeStudent = students.find(s => s.id === selectedStudentId) || students[0];

  const buildUrl = (targetPath: string) => {
    return selectedStudentId ? `${targetPath}?studentId=${selectedStudentId}` : targetPath;
  };

  const handleVersionTap = () => {
    setDiagnosticTaps(prev => {
      const nextVal = prev + 1;
      if (nextVal >= 7) {
        setActiveMoreTab('diagnostics');
        return 0;
      }
      return nextVal;
    });
  };

  if (!parent) return <>{children}</>;

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-slate-100 select-none max-w-md mx-auto border-x border-slate-800 shadow-2xl relative font-sans">
      
      {/* Dynamic Network Status Banner */}
      {networkStatus === 'offline' && (
        <div className="bg-red-600 text-white text-[10px] font-bold py-1 px-4 text-center shrink-0 flex items-center justify-center gap-1.5 z-50">
          <AlertCircle className="h-3 w-3 animate-pulse" />
          <span>🔴 Working in Offline Mode (Using Cached Data)</span>
        </div>
      )}
      {networkStatus === 'syncing' && (
        <div className="bg-amber-600 text-white text-[10px] font-bold py-1 px-4 text-center shrink-0 flex items-center justify-center gap-1.5 z-50">
          <Settings className="h-3 w-3 animate-spin" />
          <span>🟠 Auto-Syncing pending data...</span>
        </div>
      )}
      {showOnlineStatus && networkStatus === 'online' && (
        <div className="bg-green-600 text-white text-[10px] font-bold py-1 px-4 text-center shrink-0 flex items-center justify-center gap-1.5 z-50 animate-fade-out">
          <CheckCircle className="h-3 w-3" />
          <span>🟢 Connection restored. Cache updated.</span>
        </div>
      )}

      {/* Mobile Top Header */}
      <header className="sticky top-0 z-40 bg-slate-950 px-4 py-3.5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
            <Shield className="h-4.5 w-4.5" />
          </div>
          <div>
            <h1 className="text-[11px] font-black tracking-wider uppercase leading-none">
              {schoolSettings?.schoolName || 'Parent Portal'}
            </h1>
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">
              {schoolSettings?.board ? `${schoolSettings.board} Affiliated` : 'Greenwood Academy'}
            </span>
          </div>
        </div>

        {/* Child Selection Dropdown */}
        {students.length > 0 && activeStudent && (
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-[10px] font-extrabold text-slate-200 transition-colors"
            >
              <span>{activeStudent.name}</span>
              <ChevronDown className={`h-3 w-3 text-slate-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-950 text-slate-200 rounded-xl border border-slate-800 shadow-2xl py-1 overflow-hidden z-50">
                {students.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => handleStudentChange(student.id)}
                    className={`w-full text-left px-3.5 py-2 text-[10.5px] transition-colors hover:bg-slate-900 flex flex-col ${
                      student.id === selectedStudentId ? 'bg-blue-600/10 text-blue-400 font-bold' : ''
                    }`}
                  >
                    <span>{student.name}</span>
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                      Class: {student.enrollments[0]?.class?.name || 'N/A'} {student.enrollments[0]?.section?.name || ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 overflow-y-auto bg-slate-900">
        {children}
      </main>

      {/* "More" Drawer Overlay */}
      {moreMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm max-w-md mx-auto flex flex-col justify-end">
          <div className="bg-slate-950 border-t border-slate-800 rounded-t-[24px] max-h-[85vh] flex flex-col overflow-hidden">
            
            {/* Header of Drawer */}
            <div className="px-5 py-4 border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {activeMoreTab !== 'menu' && (
                  <button 
                    onClick={() => setActiveMoreTab('menu')}
                    className="text-[10px] text-slate-400 hover:text-white font-bold mr-1 uppercase tracking-wider"
                  >
                    ← Back
                  </button>
                )}
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  {activeMoreTab === 'menu' && 'Menu Options'}
                  {activeMoreTab === 'profile' && 'Parent Profile'}
                  {activeMoreTab === 'notifications' && 'Notifications'}
                  {activeMoreTab === 'downloads' && 'Downloads Manager'}
                  {activeMoreTab === 'contact' && 'Contact School'}
                  {activeMoreTab === 'diagnostics' && 'System Diagnostics'}
                </h3>
              </div>
              <button 
                onClick={() => { setMoreMenuOpen(false); setActiveMoreTab('menu'); }}
                className="p-1 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Content of Drawer */}
            <div className="flex-1 overflow-y-auto p-5 text-slate-350 space-y-4">
              
              {/* MAIN MENU TAB */}
              {activeMoreTab === 'menu' && (
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setActiveMoreTab('profile')}
                    className="p-3.5 bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-2xl flex flex-col items-center gap-2 text-center"
                  >
                    <User className="h-5 w-5 text-blue-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
                  </button>
                  <button 
                    onClick={() => setActiveMoreTab('notifications')}
                    className="p-3.5 bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-2xl flex flex-col items-center gap-2 text-center"
                  >
                    <Bell className="h-5 w-5 text-indigo-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Notices</span>
                  </button>
                  <button 
                    onClick={() => setActiveMoreTab('downloads')}
                    className="p-3.5 bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-2xl flex flex-col items-center gap-2 text-center"
                  >
                    <Download className="h-5 w-5 text-emerald-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Downloads</span>
                  </button>
                  <button 
                    onClick={() => setActiveMoreTab('contact')}
                    className="p-3.5 bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-2xl flex flex-col items-center gap-2 text-center"
                  >
                    <Phone className="h-5 w-5 text-purple-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Contact</span>
                  </button>
                </div>
              )}

              {/* PROFILE TAB */}
              {activeMoreTab === 'profile' && (
                <div className="space-y-4 text-[11px]">
                  <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl space-y-2">
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest block">Father's details</span>
                    <span className="block text-xs font-bold text-white">{parent.fatherName}</span>
                    <span className="block text-slate-400">Mobile: {parent.mobile}</span>
                  </div>
                  {parent.motherName && (
                    <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl space-y-2">
                      <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest block">Mother's details</span>
                      <span className="block text-xs font-bold text-white">{parent.motherName}</span>
                    </div>
                  )}
                </div>
              )}

              {/* NOTIFICATIONS TAB */}
              {activeMoreTab === 'notifications' && (
                <div className="space-y-2 text-[11px]">
                  <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl">
                    <div className="flex justify-between items-start">
                      <span className="px-1.5 py-0.5 bg-blue-900/40 text-blue-400 rounded text-[8px] font-bold uppercase tracking-wide">Fee Alert</span>
                      <span className="text-[8px] text-slate-550 font-bold">12/07/2026</span>
                    </div>
                    <p className="mt-1 text-slate-300 font-semibold leading-relaxed">Second term tuition fees are outstanding. Please clear prior to July 25th.</p>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl">
                    <div className="flex justify-between items-start">
                      <span className="px-1.5 py-0.5 bg-emerald-900/40 text-emerald-400 rounded text-[8px] font-bold uppercase tracking-wide">Holiday</span>
                      <span className="text-[8px] text-slate-550 font-bold">08/07/2026</span>
                    </div>
                    <p className="mt-1 text-slate-300 font-semibold leading-relaxed">The school will remain closed on Wednesday on account of Martyrdom Day.</p>
                  </div>
                </div>
              )}

              {/* DOWNLOADS MANAGER TAB */}
              {activeMoreTab === 'downloads' && (
                <div className="space-y-3 text-[11px]">
                  <div className="flex items-center justify-between p-3.5 bg-slate-900 border border-slate-850 rounded-2xl">
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-5 w-5 text-emerald-400" />
                      <div>
                        <span className="block font-bold text-white">First Term Receipt</span>
                        <span className="text-[8px] text-slate-500 uppercase tracking-wider font-mono">Format: PDF</span>
                      </div>
                    </div>
                    <button className="text-blue-400 hover:text-blue-300 text-[10px] uppercase font-bold tracking-wider">Open</button>
                  </div>
                  <div className="flex items-center justify-between p-3.5 bg-slate-900 border border-slate-850 rounded-2xl">
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-5 w-5 text-indigo-400" />
                      <div>
                        <span className="block font-bold text-white">Class 10 Syllabus</span>
                        <span className="text-[8px] text-slate-500 uppercase tracking-wider font-mono">Format: PDF</span>
                      </div>
                    </div>
                    <button className="text-blue-400 hover:text-blue-300 text-[10px] uppercase font-bold tracking-wider">Open</button>
                  </div>
                </div>
              )}

              {/* CONTACT TAB */}
              {activeMoreTab === 'contact' && (
                <div className="space-y-3 text-[11px]">
                  <div className="p-3 bg-slate-900 border border-slate-850 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="block font-bold text-white">Office Reception Desk</span>
                      <span className="text-[8px] text-slate-500 uppercase tracking-wider mt-0.5">General Inquiries</span>
                    </div>
                    <a href={`tel:${schoolSettings?.phone || '9876543210'}`} className="p-2 rounded-xl bg-blue-600/10 text-blue-400 hover:bg-blue-600/20">
                      <Phone className="h-4 w-4" />
                    </a>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-850 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="block font-bold text-white">Accounts Department</span>
                      <span className="text-[8px] text-slate-500 uppercase tracking-wider mt-0.5">Fees & Payments</span>
                    </div>
                    <a href={`mailto:${schoolSettings?.email || 'office@school.erp'}`} className="p-2 rounded-xl bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20">
                      <Mail className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              )}

              {/* DIAGNOSTICS TAB */}
              {activeMoreTab === 'diagnostics' && (
                <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl space-y-3 font-mono text-[9px] text-slate-400">
                  <div className="border-b border-slate-800 pb-2">
                    <span className="block font-bold text-white">diagnostics.sh</span>
                  </div>
                  <div>
                    <span className="block">App Version: 1.0.0-release</span>
                    <span className="block">Client Type: Capacitor/Android Shell</span>
                    <span className="block">API Target: {schoolSettings?.website || 'localhost'}</span>
                    <span className="block">Network: {networkStatus.toUpperCase()}</span>
                    <span className="block">Active Parent ID: {parent.id}</span>
                  </div>
                  <button 
                    onClick={() => setActiveMoreTab('menu')}
                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-750 text-white rounded-lg transition-colors font-bold uppercase tracking-wider text-[8px]"
                  >
                    Dismiss Logs
                  </button>
                </div>
              )}

              {/* Bottom Version Controls */}
              {activeMoreTab === 'menu' && (
                <div className="border-t border-slate-850 pt-4 flex flex-col gap-3">
                  {/* Language Selector */}
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                    <span>Language</span>
                    <div className="flex gap-2">
                      {['English', 'Hindi', 'Punjabi'].map(lang => (
                        <button
                          key={lang}
                          onClick={() => setLanguage(lang)}
                          className={`px-2 py-0.5 rounded transition-all ${
                            language === lang ? 'bg-blue-600 text-white font-extrabold' : 'bg-slate-900 text-slate-500 hover:bg-slate-850'
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 text-[9px] text-slate-500 font-bold uppercase font-mono">
                    <span onClick={handleVersionTap} className="cursor-pointer hover:text-slate-300">Version 1.0.0-release</span>
                    <button 
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="text-red-500 hover:underline flex items-center gap-1 focus:outline-none"
                    >
                      <LogOut className="h-3 w-3" />
                      <span>Logout Session</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Bottom PWA/Mobile Native Style Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-slate-950 border-t border-slate-850 shadow-2xl px-3 py-2 flex justify-between items-center text-slate-500 select-none">
        <Link 
          href={buildUrl('/portal/dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors ${
            pathname === '/portal/dashboard' ? 'text-blue-500 font-bold scale-105' : 'hover:text-slate-300 text-slate-500'
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[9px] mt-0.5 font-bold uppercase tracking-wider">Home</span>
        </Link>

        {/* Dynamic Fees Tab based on module settings */}
        {enabledModules.FINANCE && (
          <Link 
            href={buildUrl('/portal/fees')}
            className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors ${
              pathname === '/portal/fees' ? 'text-blue-500 font-bold scale-105' : 'hover:text-slate-300 text-slate-500'
            }`}
          >
            <CreditCard className="h-5 w-5" />
            <span className="text-[9px] mt-0.5 font-bold uppercase tracking-wider">Fees</span>
          </Link>
        )}

        {/* Dynamic Results Tab based on module settings */}
        {enabledModules.RESULTS && (
          <Link 
            href={buildUrl('/portal/results')}
            className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors ${
              pathname === '/portal/results' ? 'text-blue-500 font-bold scale-105' : 'hover:text-slate-300 text-slate-500'
            }`}
          >
            <Award className="h-5 w-5" />
            <span className="text-[9px] mt-0.5 font-bold uppercase tracking-wider">Results</span>
          </Link>
        )}

        <Link 
          href={buildUrl('/portal/calendar')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors ${
            pathname === '/portal/calendar' ? 'text-blue-500 font-bold scale-105' : 'hover:text-slate-300 text-slate-500'
          }`}
        >
          <Calendar className="h-5 w-5" />
          <span className="text-[9px] mt-0.5 font-bold uppercase tracking-wider">Calendar</span>
        </Link>

        {/* More Options Drawer Trigger */}
        <button
          onClick={() => setMoreMenuOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors focus:outline-none ${
            moreMenuOpen ? 'text-blue-500 font-bold' : 'hover:text-slate-300 text-slate-500'
          }`}
        >
          <User className="h-5 w-5" />
          <span className="text-[9px] mt-0.5 font-bold uppercase tracking-wider">More</span>
        </button>
      </nav>
    </div>
  );
}
