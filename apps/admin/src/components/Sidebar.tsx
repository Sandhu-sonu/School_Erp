'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, BookOpen, CreditCard, Calendar, BarChart2, 
  Settings, HeartPulse, ChevronLeft, ChevronRight, LayoutDashboard,
  ClipboardList, Globe, Bus, Bell, MapPin, Shield, Star, Search,
  ChevronDown, GraduationCap, Coins, Users2, Cpu, ClipboardCheck
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

  // Auto-expand accordion groups matching path on mount/navigation
  useEffect(() => {
    const matched = menuGroups.find(g => 
      g.items.some(item => item.visible && (pathname === item.href || pathname.startsWith(item.href + '/')))
    );
    if (matched && matched.name !== 'General') {
      setExpandedGroups(prev => ({ ...prev, [matched.name]: true }));
    }
  }, [pathname]);

  // Collect all visible items
  const allItems = menuGroups.flatMap(g => g.items).filter(i => i.visible);

  // Favorites list
  const favoriteItems = allItems.filter(i => favorites.includes(i.href));

  // Filtered list based on Search
  const filteredGroups = menuGroups.map(group => {
    const items = group.items.filter(item => 
      item.visible && item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return { ...group, items };
  }).filter(group => group.items.length > 0);

  return (
    <div className={`flex flex-col bg-slate-950 text-slate-400 transition-all duration-300 border-r border-slate-800/80 ${collapsed ? 'w-16' : 'w-64'} h-full shrink-0 relative z-30`}>
      {/* Sidebar Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-sm">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
              <GraduationCap className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-white tracking-widest uppercase leading-none">
                Greenwood
              </span>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                ERP Session 2026-27
              </span>
            </div>
          </div>
        ) : (
          <div className="p-1 rounded-lg bg-primary text-white mx-auto">
            <GraduationCap className="h-4 w-4" />
          </div>
        )}
        {!collapsed && (
          <button 
            onClick={() => setCollapsed(true)} 
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all ml-auto focus:outline-none"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Collapse controls for collapsed state */}
      {collapsed && (
        <div className="flex justify-center py-2 border-b border-slate-900">
          <button 
            onClick={() => setCollapsed(false)} 
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all focus:outline-none"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search menu items */}
      {!collapsed && (
        <div className="p-3.5 border-b border-slate-900/60">
          <div className="relative group">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Jump to... (Ctrl+K)"
              className="w-full pl-9 pr-3 py-1.5 text-[11px] bg-slate-900 border border-slate-850 rounded-xl focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 text-slate-200 placeholder-slate-500 font-medium transition-all"
            />
          </div>
        </div>
      )}

      {/* Sidebar Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 space-y-5 px-3 select-none scrollbar-thin">
        {/* Favorites Group (if any exists) */}
        {!collapsed && favoriteItems.length > 0 && (
          <div className="space-y-1">
            <span className="px-2 text-[8px] font-black text-slate-600 uppercase tracking-widest block mb-1">
              Favorites
            </span>
            {favoriteItems.map((item, idx) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link 
                  key={idx}
                  href={item.href}
                  className={`flex items-center justify-between group px-3 py-2 rounded-xl text-xs transition-all ${
                    isActive 
                      ? 'sidebar-link-active' 
                      : 'hover:bg-slate-900/60 text-slate-400 hover:text-slate-250 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate font-medium">
                    <Icon className="h-4 w-4 shrink-0 text-slate-450 group-hover:text-slate-300" />
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

        {/* Regular Menu Groups */}
        <div className="space-y-1.5">
          {filteredGroups.map((group, groupIdx) => {
            const hasChildren = group.items.length > 1 || group.name !== 'General';
            const isGroupExpanded = !!expandedGroups[group.name];
            const GroupIcon = group.icon;
            
            // Render single parent link if group is 'General'
            if (!hasChildren) {
              const item = group.items[0];
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link 
                  key={groupIdx}
                  href={item.href}
                  title={collapsed ? item.name : undefined}
                  className={`flex items-center justify-between group px-3 py-2 rounded-xl text-xs transition-all relative ${
                    isActive 
                      ? 'sidebar-link-active' 
                      : 'hover:bg-slate-900/60 text-slate-450 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate font-medium">
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </div>
                  {collapsed && (
                    <div className="absolute left-16 bg-slate-950 text-white text-[10px] font-bold py-1.5 px-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-40 pointer-events-none uppercase tracking-wider whitespace-nowrap shadow-xl border border-slate-800">
                      {item.name}
                    </div>
                  )}
                </Link>
              );
            }

            // Accordion Folder rendering
            return (
              <div key={groupIdx} className="space-y-1">
                {!collapsed ? (
                  <>
                    <button
                      onClick={() => toggleGroup(group.name)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-350 focus:outline-none transition-colors`}
                    >
                      <div className="flex items-center gap-2">
                        <GroupIcon className="h-3.5 w-3.5" />
                        <span className="text-[9px] tracking-widest">{group.name}</span>
                      </div>
                      <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isGroupExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isGroupExpanded && (
                      <div className="pl-3.5 space-y-0.5 border-l border-slate-800/80 ml-4.5 mt-1 animate-in slide-in-from-top-1 duration-150">
                        {group.items.map((item, itemIdx) => {
                          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                          const Icon = item.icon;
                          const isFav = favorites.includes(item.href);

                          return (
                            <Link
                              key={itemIdx}
                              href={item.href}
                              className={`flex items-center justify-between group px-3 py-1.5 rounded-xl text-[11px] transition-all relative ${
                                isActive 
                                  ? 'sidebar-link-active' 
                                  : 'hover:bg-slate-900/60 text-slate-450 hover:text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate font-semibold">
                                <Icon className="h-3.5 w-3.5 shrink-0 text-slate-500 group-hover:text-slate-350" />
                                <span className="truncate">{item.name}</span>
                              </div>
                              <button 
                                onClick={(e) => toggleFavorite(e, item.href)}
                                className={`opacity-0 group-hover:opacity-100 transition-all focus:outline-none ${
                                  isFav ? 'text-amber-400 opacity-100' : 'text-slate-655 hover:text-amber-400'
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
                  // Collapsed hover folder icon
                  <div className="relative group">
                    <button 
                      onClick={() => setCollapsed(false)}
                      className="w-full flex items-center justify-center p-2 rounded-xl text-slate-450 hover:text-slate-200 hover:bg-slate-900/60 focus:outline-none transition-colors"
                      title={group.name}
                    >
                      <GroupIcon className="h-4.5 w-4.5" />
                    </button>
                    {/* Hover items popover bubble */}
                    <div className="absolute left-16 top-0 bg-slate-950 text-white rounded-xl shadow-2xl p-2.5 opacity-0 group-hover:opacity-100 transition-opacity z-40 border border-slate-800 pointer-events-auto min-w-[150px] space-y-1">
                      <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-1 mb-1">{group.name}</span>
                      {group.items.map((item, itemIdx) => (
                        <Link
                          key={itemIdx}
                          href={item.href}
                          className="block px-2 py-1 text-[10px] text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors text-left truncate"
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
    </div>
  );
}
