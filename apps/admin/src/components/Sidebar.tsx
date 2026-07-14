'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { 
  Users, BookOpen, CreditCard, Calendar, BarChart2, 
  Settings, HeartPulse, ChevronLeft, ChevronRight, LayoutDashboard,
  ClipboardList, Globe, Bus, Bell, MapPin, Shield, Star, Search,
  ChevronDown, GraduationCap, Coins, Users2, Cpu, ClipboardCheck,
  LogOut, User, Activity, ToggleLeft
} from 'lucide-react';
import { UserRole, RolePermissions } from '@school-erp/utils';

interface SidebarProps {
  userRole: UserRole;
  enabledModules?: string[];
}

export default function Sidebar({ userRole, enabledModules = [] }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  
  const pathname = usePathname();
  const { data: session } = useSession();

  useEffect(() => {
    const saved = localStorage.getItem('erp-favorites');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  const toggleFavorite = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites(prev => {
      const updated = prev.includes(href) ? prev.filter(x => x !== href) : [...prev, href];
      localStorage.setItem('erp-favorites', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const menuGroups = [
    {
      name: 'General',
      icon: LayoutDashboard,
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, visible: true }
      ]
    },
    {
      name: 'Academics',
      icon: GraduationCap,
      items: [
        { name: 'Students', href: '/dashboard/academics/students', icon: Users, visible: RolePermissions[userRole].academics !== 'none' },
        { name: 'Sessions', href: '/dashboard/academics/sessions', icon: Calendar, visible: RolePermissions[userRole].academics === 'write' },
        { name: 'Classes & Sections', href: '/dashboard/academics/classes', icon: BookOpen, visible: RolePermissions[userRole].academics === 'write' },
        { name: 'Subjects Matrix', href: '/dashboard/academics/subjects', icon: BookOpen, visible: userRole !== 'ACCOUNTANT' },
        { name: 'Class Timetable', href: '/dashboard/academics/timetable', icon: Calendar, visible: userRole !== 'ACCOUNTANT' },
        { name: 'Promotions', href: '/dashboard/academics/promotions', icon: ClipboardList, visible: RolePermissions[userRole].academics === 'write' }
      ]
    },
    {
      name: 'Exams & Results',
      icon: ClipboardCheck,
      items: [
        { name: 'Exams Control', href: '/dashboard/exams', icon: ClipboardList, visible: userRole !== 'ACCOUNTANT' && enabledModules.includes('EXAMS') },
        { name: 'Results Desk', href: '/dashboard/results', icon: BarChart2, visible: userRole !== 'ACCOUNTANT' && enabledModules.includes('RESULTS') }
      ]
    },
    {
      name: 'Admissions',
      icon: Users2,
      items: [
        { name: 'Registration', href: '/dashboard/admissions/registration', icon: Users, visible: RolePermissions[userRole].admissions !== 'none' },
        { name: 'Leads Pipeline', href: '/dashboard/admissions/leads', icon: BarChart2, visible: RolePermissions[userRole].admissions !== 'none' }
      ]
    },
    {
      name: 'Finance',
      icon: Coins,
      items: [
        { name: 'Fee Ledger', href: '/dashboard/finance/ledger', icon: CreditCard, visible: RolePermissions[userRole].finance !== 'none' && userRole !== 'CLERK' },
        { name: 'Expenses Log', href: '/dashboard/finance/expenses', icon: CreditCard, visible: RolePermissions[userRole].finance === 'write' && userRole !== 'CLERK' },
        { name: 'Fee Collection', href: '/dashboard/finance/fees', icon: CreditCard, visible: RolePermissions[userRole].finance !== 'none' }
      ]
    },
    {
      name: 'HR & Payroll',
      icon: Users,
      items: [
        { name: 'Staff Directory', href: '/dashboard/hr/staff', icon: Users, visible: (userRole === 'PRINCIPAL' || userRole === 'ACCOUNTANT' || userRole === 'CLERK') && enabledModules.includes('HR') },
        { name: 'Salary Desk', href: '/dashboard/hr/salary', icon: CreditCard, visible: (userRole === 'PRINCIPAL' || userRole === 'ACCOUNTANT') && enabledModules.includes('SALARY') },
        { name: 'HR Reports', href: '/dashboard/reports/hr', icon: BarChart2, visible: (userRole === 'PRINCIPAL' || userRole === 'ACCOUNTANT') && enabledModules.includes('HR') }
      ]
    },
    {
      name: 'Operations',
      icon: Settings,
      items: [
        { name: 'Attendance Grid', href: '/dashboard/operations/attendance', icon: Calendar, visible: RolePermissions[userRole].operations !== 'none' && enabledModules.includes('ATTENDANCE') }
      ]
    },
    {
      name: 'Reports & Website',
      icon: Globe,
      items: [
        { name: 'Reports Desk', href: '/dashboard/reports', icon: BarChart2, visible: RolePermissions[userRole].reports !== 'none' || userRole === 'TEACHER' },
        { name: 'Public Website', href: '/dashboard/website', icon: Globe, visible: RolePermissions[userRole].website !== 'none' && enabledModules.includes('WEBSITE') }
      ]
    },
    {
      name: 'Transport',
      icon: Bus,
      items: [
        { name: 'Routes & Stops', href: '/dashboard/transport/routes', icon: MapPin, visible: (userRole === 'PRINCIPAL' || userRole === 'CLERK') && enabledModules.includes('TRANSPORT') },
        { name: 'Student Transport', href: '/dashboard/transport/students', icon: Bus, visible: userRole !== 'ACCOUNTANT' && enabledModules.includes('TRANSPORT') }
      ]
    },
    {
      name: 'Communications',
      icon: Bell,
      items: [
        { name: 'Notice Board', href: '/dashboard/communications', icon: Bell, visible: userRole !== 'ACCOUNTANT' && enabledModules.includes('COMMUNICATIONS') }
      ]
    },
    {
      name: 'System Settings',
      icon: Cpu,
      items: [
        { name: 'School Settings', href: '/dashboard/system/school-settings', icon: Settings, visible: RolePermissions[userRole].system === 'write' },
        { name: 'Module Settings', href: '/dashboard/system/settings/modules', icon: Shield, visible: RolePermissions[userRole].system === 'write' },
        { name: 'System Health', href: '/dashboard/system/health', icon: HeartPulse, visible: RolePermissions[userRole].system === 'write' },
        { name: 'System Errors', href: '/dashboard/system/errors', icon: ClipboardList, visible: RolePermissions[userRole].system === 'write' },
        { name: 'System Audit', href: '/dashboard/system/audit', icon: BarChart2, visible: RolePermissions[userRole].system === 'write' },
        { name: 'System Backups', href: '/dashboard/system/backups', icon: Shield, visible: RolePermissions[userRole].system === 'write' },
        { name: 'System Imports', href: '/dashboard/system/imports', icon: Settings, visible: RolePermissions[userRole].system === 'write' },
        { name: 'System Exports', href: '/dashboard/system/exports', icon: BarChart2, visible: RolePermissions[userRole].system === 'write' },
        { name: 'UAT Tracking', href: '/dashboard/system/uat', icon: ClipboardList, visible: RolePermissions[userRole].system === 'write' },
        { name: 'System Maintenance', href: '/dashboard/system/maintenance', icon: Settings, visible: RolePermissions[userRole].system === 'write' }
      ]
    }
  ];

  const quickActionsByRole: Record<UserRole, { name: string; href: string }[]> = {
    PRINCIPAL: [
      { name: 'Collect Fees', href: '/dashboard/finance/fees' },
      { name: 'New Admission', href: '/dashboard/admissions/registration' },
      { name: 'New Staff', href: '/dashboard/hr/staff/new' }
    ],
    CLERK: [
      { name: 'New Admission', href: '/dashboard/admissions/registration' },
      { name: 'Attendance Grid', href: '/dashboard/operations/attendance' }
    ],
    ACCOUNTANT: [
      { name: 'Collect Fees', href: '/dashboard/finance/fees' },
      { name: 'Expenses Log', href: '/dashboard/finance/expenses' }
    ],
    TEACHER: [
      { name: 'Attendance Grid', href: '/dashboard/operations/attendance' },
      { name: 'Results Desk', href: '/dashboard/results' }
    ],
    HEAD: [
      { name: 'Collect Fees', href: '/dashboard/finance/fees' },
      { name: 'New Admission', href: '/dashboard/admissions/registration' },
      { name: 'New Staff', href: '/dashboard/hr/staff/new' }
    ]
  };

  useEffect(() => {
    const matched = menuGroups.find(g => 
      g.items.some(item => item.visible && (pathname === item.href || pathname.startsWith(item.href + '/')))
    );
    if (matched && matched.name !== 'General') {
      setExpandedGroups(prev => ({ ...prev, [matched.name]: true }));
    }
  }, [pathname]);

  const allItems = menuGroups.flatMap(g => g.items).filter(i => i.visible);
  const favoriteItems = allItems.filter(i => favorites.includes(i.href));

  const filteredGroups = menuGroups.map(group => {
    const items = group.items.filter(item => 
      item.visible && item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return { ...group, items };
  }).filter(group => group.items.length > 0);

  const userName = session?.user?.name || 'Admin User';
  const userRoleLabel = userRole || 'PRINCIPAL';

  return (
    <div className={`flex flex-col bg-[#0B1220] text-[#94A3B8] transition-all duration-200 border-r border-white/[0.06] ${collapsed ? 'w-18' : 'w-[255px]'} h-full shrink-0 relative z-30 font-sans select-none`}>
      
      {/* 1. Branding Header Section */}
      <div className="flex flex-col px-4 py-3.5 border-b border-white/[0.06] bg-[#090f1b]/30">
        <div className="flex items-center justify-between">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-md shadow-blue-500/10 shrink-0">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-[#F8FAFC] uppercase tracking-wide truncate max-w-[150px]">
                  Greenwood School
                </span>
                <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
                  CBSE Affiliated
                </span>
              </div>
            </div>
          ) : (
            <div className="h-9 w-9 rounded-xl bg-[#2563EB] flex items-center justify-center text-white mx-auto shadow-md shadow-blue-500/10">
              <GraduationCap className="h-5 w-5" />
            </div>
          )}
          {!collapsed && (
            <button 
              onClick={() => setCollapsed(true)} 
              className="p-1 rounded-lg hover:bg-[#1E293B] text-slate-500 hover:text-white transition-colors focus:outline-none"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {!collapsed && (
          <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/[0.04]">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Session: 2026–27</span>
            <span className="text-[8px] font-mono text-slate-600">v1.0.0</span>
          </div>
        )}
      </div>

      {/* Collapse controls for collapsed state */}
      {collapsed && (
        <div className="flex justify-center py-2.5 border-b border-white/[0.04]">
          <button 
            onClick={() => setCollapsed(false)} 
            className="p-1 rounded-lg hover:bg-[#1E293B] text-slate-500 hover:text-white transition-colors focus:outline-none"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 2. Global Search Box */}
      {!collapsed && (
        <div className="p-3 border-b border-white/[0.04]">
          <div className="relative group cursor-pointer" onClick={() => {
            const e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
            document.dispatchEvent(e);
          }}>
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500 group-hover:text-[#60A5FA] transition-colors" />
            <div className="w-full pl-8 pr-3 py-1.5 text-[10px] bg-[#111827] border border-white/[0.06] rounded-lg text-slate-400 hover:border-white/10 transition-colors flex items-center justify-between font-medium">
              <span className="truncate">Search Students, Staff, Receipts...</span>
              <kbd className="bg-[#1E293B] text-[8px] px-1 py-0.5 rounded border border-white/[0.06] font-mono leading-none">
                Ctrl+K
              </kbd>
            </div>
          </div>
        </div>
      )}

      {/* 3. Quick Actions Panel */}
      {!collapsed && (
        <div className="px-3 py-2 flex flex-wrap gap-1.5 border-b border-white/[0.04] bg-[#090f1b]/10 select-none">
          {quickActionsByRole[userRole]?.map((act, idx) => (
            <Link
              key={idx}
              href={act.href}
              className="px-2 py-1 text-[9px] font-bold bg-[#111827] hover:bg-[#1E293B] text-slate-350 hover:text-[#F8FAFC] rounded-lg transition-colors border border-white/[0.04]"
            >
              + {act.name}
            </Link>
          ))}
        </div>
      )}

      {/* 4. High-Density Scrollable Link Console */}
      <div className="flex-1 overflow-y-auto py-3 space-y-4 px-2 scrollbar-thin select-none">
        
        {/* Favorites Section */}
        {!collapsed && favoriteItems.length > 0 && (
          <div className="space-y-0.5">
            <span className="px-3 text-[8px] font-black text-slate-600 uppercase tracking-widest block mb-1">
              ⭐ Favorites
            </span>
            {favoriteItems.map((item, idx) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link 
                  key={idx}
                  href={item.href}
                  className={`group relative flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-semibold transition-all duration-150 ease-out hover:translate-x-1 hover:bg-[#1E293B] hover:text-[#F8FAFC] ${
                    isActive 
                      ? 'bg-[#1E293B] text-[#F8FAFC] font-bold border-l-2 border-[#2563EB] pl-2.5 rounded-l-none' 
                      : 'text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`h-4 w-4 shrink-0 transition-transform duration-150 ${isActive ? 'text-[#60A5FA]' : 'text-slate-500'}`} />
                    <span className="truncate">{item.name}</span>
                  </div>
                  <button 
                    onClick={(e) => toggleFavorite(e, item.href)}
                    className="opacity-0 group-hover:opacity-100 text-amber-400 hover:scale-110 transition-all focus:outline-none"
                  >
                    <Star className="h-3 w-3 fill-current" />
                  </button>
                </Link>
              );
            })}
          </div>
        )}

        {/* Regular Modules */}
        <div className="space-y-1.5">
          {filteredGroups.map((group, groupIdx) => {
            const isDashboard = group.name === 'General';
            const isGroupExpanded = !!expandedGroups[group.name];
            const GroupIcon = group.icon;

            if (isDashboard) {
              const item = group.items[0];
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link 
                  key={groupIdx}
                  href={item.href}
                  title={collapsed ? item.name : undefined}
                  className={`group relative flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-bold transition-all duration-150 ease-out hover:translate-x-1 hover:bg-[#1E293B] hover:text-[#F8FAFC] ${
                    isActive 
                      ? 'bg-[#1E293B] text-[#F8FAFC] border-l-2 border-[#2563EB] pl-2.5 rounded-l-none' 
                      : 'text-[#F8FAFC] border border-white/[0.04] bg-[#090f1b]/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`h-4 w-4 shrink-0 transition-transform duration-150 ${isActive ? 'text-[#60A5FA]' : 'text-[#60A5FA]'}`} />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </div>
                  {collapsed && (
                    <div className="absolute left-16 bg-[#111827] text-white text-[9px] font-bold py-1.5 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none uppercase tracking-wider whitespace-nowrap shadow-xl border border-white/[0.06]">
                      {item.name}
                    </div>
                  )}
                </Link>
              );
            }

            return (
              <div key={groupIdx} className="space-y-0.5">
                {!collapsed ? (
                  <>
                    <button
                      onClick={() => toggleGroup(group.name)}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-350 focus:outline-none transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <GroupIcon className="h-3.5 w-3.5 text-slate-650" />
                        <span>{group.name}</span>
                      </div>
                      <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isGroupExpanded ? 'rotate-180 text-blue-500' : 'text-slate-600'}`} />
                    </button>
                    
                    {isGroupExpanded && (
                      <div className="pl-2.5 space-y-0.5 border-l border-white/[0.04] ml-4.5 mt-0.5">
                        {group.items.map((item, itemIdx) => {
                          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                          const Icon = item.icon;
                          const isFav = favorites.includes(item.href);

                          return (
                            <Link
                              key={itemIdx}
                              href={item.href}
                              className={`group relative flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-155 ease-out hover:translate-x-1 hover:bg-[#1E293B] hover:text-[#F8FAFC] ${
                                isActive 
                                  ? 'bg-[#1E293B] text-[#F8FAFC] font-bold border-l-2 border-[#2563EB] pl-2.5 rounded-l-none' 
                                  : 'text-slate-400'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Icon className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${isActive ? 'text-[#60A5FA]' : 'text-slate-500'}`} />
                                <span className="truncate text-[10.5px]">{item.name}</span>
                              </div>
                              <button 
                                onClick={(e) => toggleFavorite(e, item.href)}
                                className={`opacity-0 group-hover:opacity-100 transition-all focus:outline-none ${
                                  isFav ? 'text-amber-400 opacity-100' : 'text-slate-600 hover:text-amber-400'
                                }`}
                              >
                                <Star className={`h-3 w-3 ${isFav ? 'fill-current' : ''}`} />
                              </button>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="relative group">
                    <button 
                      onClick={() => setCollapsed(false)}
                      className="w-full flex items-center justify-center p-2 rounded-lg text-slate-450 hover:text-[#F8FAFC] hover:bg-[#1E293B] focus:outline-none transition-colors"
                      title={group.name}
                    >
                      <GroupIcon className="h-4.5 w-4.5" />
                    </button>
                    {/* Hover Popover */}
                    <div className="absolute left-16 top-0 bg-[#111827] text-white rounded-lg shadow-2xl p-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-auto min-w-[170px] space-y-0.5 border border-white/[0.06]">
                      <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-white/[0.04] pb-1 mb-1">
                        {group.name}
                      </span>
                      {group.items.map((item, itemIdx) => (
                        <Link
                          key={itemIdx}
                          href={item.href}
                          className="block px-2 py-1 text-[10px] text-slate-400 hover:text-white rounded-md hover:bg-[#1E293B] transition-colors text-left truncate font-semibold"
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Teams-Style Bottom User Card & Dropdown */}
      <div className="p-3 border-t border-white/[0.06] bg-[#090f1b]/30 relative">
        {profileMenuOpen && (
          <div className="absolute bottom-14 left-3 right-3 bg-[#111827] border border-white/[0.08] rounded-xl shadow-2xl p-2.5 z-55 text-slate-350 animate-in slide-in-from-bottom-2 duration-150">
            <div className="border-b border-white/[0.04] pb-2 mb-1">
              <span className="block text-[11px] text-white font-bold">{userName}</span>
              <span className="block text-[8px] text-slate-500 uppercase font-mono tracking-wider">{userRoleLabel}</span>
            </div>
            <div className="space-y-0.5 py-1">
              <Link 
                href="/dashboard/system/settings" 
                className="block px-2 py-1 text-[10px] hover:bg-[#1E293B] rounded-lg text-slate-300 hover:text-white transition-colors"
                onClick={() => setProfileMenuOpen(false)}
              >
                Preferences & Settings
              </Link>
              <button 
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full text-left block px-2 py-1 text-[10px] hover:bg-red-950/20 text-red-400 hover:text-red-300 rounded-lg transition-colors focus:outline-none"
              >
                Logout Session
              </button>
            </div>
          </div>
        )}

        <div 
          onClick={() => setProfileMenuOpen(!profileMenuOpen)}
          className="flex items-center justify-between gap-2.5 cursor-pointer p-1.5 hover:bg-[#1E293B] rounded-xl transition-all"
        >
          <div className="flex items-center gap-2 truncate">
            {/* Avatar with Status Dot */}
            <div className="relative shrink-0">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center text-white text-xs font-black uppercase shadow-inner">
                {userName.slice(0, 2)}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-[#0B1220]" />
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="text-[10.5px] font-extrabold text-[#F8FAFC] truncate leading-tight">
                  {userName}
                </span>
                <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wider leading-none mt-0.5">
                  {userRoleLabel}
                </span>
              </div>
            )}
          </div>
          {!collapsed && (
            <ChevronDown className="h-3 w-3 text-slate-550 shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
}
