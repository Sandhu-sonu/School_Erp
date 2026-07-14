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
  LogOut, User
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
    <div className={`flex flex-col bg-[#0B1220] text-[#94A3B8] transition-all duration-300 border-r border-white/[0.06] ${collapsed ? 'w-20' : 'w-[270px]'} h-full shrink-0 relative z-30 font-sans`}>
      {/* 1. School Branding Header */}
      <div className="h-20 flex items-center justify-between px-4 border-b border-white/[0.06] bg-[#090f1b]/50 backdrop-blur-md">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-gradient-to-tr from-[#2563EB] to-[#60A5FA] text-white shadow-xl shadow-blue-500/20">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] font-black text-[#F8FAFC] tracking-wider uppercase leading-none">
                Greenwood
              </span>
              <span className="text-[9px] font-extrabold text-[#60A5FA] uppercase tracking-widest mt-0.5">
                ERP Premium Ed.
              </span>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                Session 2026-27
              </span>
            </div>
          </div>
        ) : (
          <div className="p-2 rounded-2xl bg-gradient-to-tr from-[#2563EB] to-[#60A5FA] text-white mx-auto shadow-lg shadow-blue-500/25">
            <GraduationCap className="h-5 w-5" />
          </div>
        )}
        {!collapsed && (
          <button 
            onClick={() => setCollapsed(true)} 
            className="p-1.5 rounded-xl hover:bg-[#1E293B] text-slate-400 hover:text-white transition-all ml-auto focus:outline-none border border-transparent hover:border-white/[0.06]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Collapse controls for collapsed state */}
      {collapsed && (
        <div className="flex justify-center py-2 border-b border-white/[0.04]">
          <button 
            onClick={() => setCollapsed(false)} 
            className="p-1.5 rounded-xl hover:bg-[#1E293B] text-slate-400 hover:text-white transition-all focus:outline-none border border-transparent hover:border-white/[0.06]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 2. Global Search Command Trigger */}
      {!collapsed && (
        <div className="p-4 border-b border-white/[0.04]">
          <div className="relative group cursor-pointer" onClick={() => {
            const e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
            document.dispatchEvent(e);
          }}>
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500 group-hover:text-[#60A5FA] transition-colors" />
            <div className="w-full pl-10 pr-3 py-2 text-[11px] bg-[#111827] border border-white/[0.06] rounded-xl text-slate-400 hover:border-white/15 transition-all flex items-center justify-between font-medium">
              <span>Search anything...</span>
              <kbd className="bg-[#1E293B] text-slate-400 text-[9px] px-1.5 py-0.5 rounded border border-white/[0.06] font-mono leading-none">
                Ctrl K
              </kbd>
            </div>
          </div>
        </div>
      )}

      {/* 3. Navigation Links Grid */}
      <div className="flex-1 overflow-y-auto py-5 space-y-6 px-3 select-none scrollbar-thin">
        {/* Favorites Group */}
        {!collapsed && favoriteItems.length > 0 && (
          <div className="space-y-1">
            <span className="px-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
              ⭐ Pinned Items
            </span>
            {favoriteItems.map((item, idx) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link 
                  key={idx}
                  href={item.href}
                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-150 ease-out hover:translate-x-1 hover:bg-[#1E293B] hover:text-[#F8FAFC] ${
                    isActive 
                      ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/5 border border-blue-500/25 text-[#F8FAFC] font-semibold' 
                      : 'text-slate-400 border border-transparent'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#2563EB] rounded-r-full shadow-lg shadow-blue-500/50" />
                  )}
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform duration-150 group-hover:scale-110 ${isActive ? 'text-[#60A5FA]' : 'text-[#94A3B8]'}`} />
                    <span className="truncate">{item.name}</span>
                  </div>
                  <button 
                    onClick={(e) => toggleFavorite(e, item.href)}
                    className="opacity-0 group-hover:opacity-100 text-amber-400 hover:scale-110 transition-all focus:outline-none"
                  >
                    <Star className="h-3.5 w-3.5 fill-current" />
                  </button>
                </Link>
              );
            })}
          </div>
        )}

        {/* Regular Accordion-organized Menu Groups */}
        <div className="space-y-2">
          {filteredGroups.map((group, groupIdx) => {
            const hasChildren = group.items.length > 1 || group.name !== 'General';
            const isGroupExpanded = !!expandedGroups[group.name];
            const GroupIcon = group.icon;
            
            if (!hasChildren) {
              const item = group.items[0];
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link 
                  key={groupIdx}
                  href={item.href}
                  title={collapsed ? item.name : undefined}
                  className={`group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-150 ease-out hover:translate-x-1 hover:bg-[#1E293B] hover:text-[#F8FAFC] ${
                    isActive 
                      ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/5 border border-blue-500/25 text-[#F8FAFC] font-semibold animate-pulse-subtle' 
                      : 'text-slate-400 border border-transparent'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#2563EB] rounded-r-full shadow-lg shadow-blue-500/50" />
                  )}
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform duration-150 group-hover:scale-110 ${isActive ? 'text-[#60A5FA]' : 'text-slate-500'}`} />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </div>
                  {collapsed && (
                    <div className="absolute left-18 bg-[#111827] text-white text-[10px] font-extrabold py-2 px-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none uppercase tracking-wider whitespace-nowrap shadow-2xl border border-white/[0.06]">
                      {item.name}
                    </div>
                  )}
                </Link>
              );
            }

            return (
              <div key={groupIdx} className="space-y-1">
                {!collapsed ? (
                  <>
                    <button
                      onClick={() => toggleGroup(group.name)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-widest text-slate-500 hover:text-slate-350 focus:outline-none transition-colors border border-transparent`}
                    >
                      <div className="flex items-center gap-2.5">
                        <GroupIcon className="h-3.5 w-3.5 text-slate-600" />
                        <span>{group.name}</span>
                      </div>
                      <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isGroupExpanded ? 'rotate-180 text-blue-500' : 'text-slate-600'}`} />
                    </button>
                    
                    {isGroupExpanded && (
                      <div className="pl-3 space-y-0.5 border-l border-white/[0.04] ml-5.5 mt-1 animate-in slide-in-from-top-1 duration-150">
                        {group.items.map((item, itemIdx) => {
                          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                          const Icon = item.icon;
                          const isFav = favorites.includes(item.href);

                          return (
                            <Link
                              key={itemIdx}
                              href={item.href}
                              className={`group relative flex items-center justify-between px-3.5 py-2 rounded-xl text-[11px] font-semibold transition-all duration-150 ease-out hover:translate-x-1 hover:bg-[#1E293B] hover:text-[#F8FAFC] ${
                                isActive 
                                  ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/5 border border-blue-500/25 text-[#F8FAFC]' 
                                  : 'text-slate-400 border border-transparent'
                              }`}
                            >
                              {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5.5 bg-[#2563EB] rounded-r-full shadow-lg shadow-blue-500/50" />
                              )}
                              <div className="flex items-center gap-2.5 truncate">
                                <Icon className={`h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-115 ${isActive ? 'text-[#60A5FA]' : 'text-slate-500'}`} />
                                <span className="truncate">{item.name}</span>
                              </div>
                              <button 
                                onClick={(e) => toggleFavorite(e, item.href)}
                                className={`opacity-0 group-hover:opacity-100 transition-all focus:outline-none ${
                                  isFav ? 'text-amber-400 opacity-100' : 'text-slate-600 hover:text-amber-400'
                                }`}
                              >
                                <Star className={`h-3.5 w-3.5 ${isFav ? 'fill-current' : ''}`} />
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
                      className="w-full flex items-center justify-center p-2.5 rounded-xl text-slate-400 hover:text-[#F8FAFC] hover:bg-[#1E293B] focus:outline-none transition-colors border border-transparent"
                    >
                      <GroupIcon className="h-4.5 w-4.5" />
                    </button>
                    {/* Hover items popover bubble */}
                    <div className="absolute left-18 top-0 bg-[#111827] text-[#F8FAFC] rounded-2xl shadow-2xl p-3.5 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-auto min-w-[185px] space-y-1 border border-white/[0.06]">
                      <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-white/[0.04] pb-1.5 mb-1.5">
                        {group.name}
                      </span>
                      {group.items.map((item, itemIdx) => (
                        <Link
                          key={itemIdx}
                          href={item.href}
                          className="block px-2.5 py-1.5 text-[10px] text-slate-450 hover:text-white rounded-lg hover:bg-[#1E293B] transition-colors text-left truncate font-semibold"
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

      {/* 4. Bottom User Profile Card */}
      <div className="p-4 border-t border-white/[0.06] bg-[#090f1b]/40">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 truncate">
            {/* User Avatar Circle */}
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-[#60A5FA] flex items-center justify-center text-white font-extrabold uppercase shrink-0 shadow-lg shadow-blue-500/10">
              {userName.slice(0, 2)}
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="text-[11px] font-extrabold text-[#F8FAFC] truncate leading-tight">
                  {userName}
                </span>
                <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider leading-none mt-1">
                  {userRoleLabel}
                </span>
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="flex items-center gap-1 shrink-0">
              <Link 
                href="/dashboard/system/settings"
                title="System Settings"
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-[#1E293B] transition-colors"
              >
                <Settings className="h-4 w-4" />
              </Link>
              <button 
                onClick={() => signOut({ callbackUrl: '/login' })}
                title="Sign Out"
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/20 transition-colors focus:outline-none"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
