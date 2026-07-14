'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, BookOpen, CreditCard, Calendar, BarChart2, 
  Settings, HeartPulse, ChevronLeft, ChevronRight, LayoutDashboard,
  ClipboardList, Globe, Bus, Bell, MapPin, Shield, Star, Search
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

  const menuGroups = [
    {
      name: 'General',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, visible: true }
      ]
    },
    {
      name: 'Academics',
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
      items: [
        { name: 'Exams Control', href: '/dashboard/exams', icon: ClipboardList, visible: userRole !== 'ACCOUNTANT' && enabledModules.includes('EXAMS') },
        { name: 'Results Desk', href: '/dashboard/results', icon: BarChart2, visible: userRole !== 'ACCOUNTANT' && enabledModules.includes('RESULTS') }
      ]
    },
    {
      name: 'Admissions',
      items: [
        { name: 'Registration', href: '/dashboard/admissions/registration', icon: Users, visible: RolePermissions[userRole].admissions !== 'none' },
        { name: 'Leads Pipeline', href: '/dashboard/admissions/leads', icon: BarChart2, visible: RolePermissions[userRole].admissions !== 'none' }
      ]
    },
    {
      name: 'Finance',
      items: [
        { name: 'Fee Ledger', href: '/dashboard/finance/ledger', icon: CreditCard, visible: RolePermissions[userRole].finance !== 'none' && userRole !== 'CLERK' },
        { name: 'Expenses Log', href: '/dashboard/finance/expenses', icon: CreditCard, visible: RolePermissions[userRole].finance === 'write' && userRole !== 'CLERK' },
        { name: 'Fee Collection', href: '/dashboard/finance/fees', icon: CreditCard, visible: RolePermissions[userRole].finance !== 'none' }
      ]
    },
    {
      name: 'HR & Payroll',
      items: [
        { name: 'Staff Directory', href: '/dashboard/hr/staff', icon: Users, visible: (userRole === 'PRINCIPAL' || userRole === 'ACCOUNTANT' || userRole === 'CLERK') && enabledModules.includes('HR') },
        { name: 'Salary Desk', href: '/dashboard/hr/salary', icon: CreditCard, visible: (userRole === 'PRINCIPAL' || userRole === 'ACCOUNTANT') && enabledModules.includes('SALARY') },
        { name: 'HR Reports', href: '/dashboard/reports/hr', icon: BarChart2, visible: (userRole === 'PRINCIPAL' || userRole === 'ACCOUNTANT') && enabledModules.includes('HR') }
      ]
    },
    {
      name: 'Operations',
      items: [
        { name: 'Attendance Grid', href: '/dashboard/operations/attendance', icon: Calendar, visible: RolePermissions[userRole].operations !== 'none' && enabledModules.includes('ATTENDANCE') }
      ]
    },
    {
      name: 'Reports & Website',
      items: [
        { name: 'Reports Desk', href: '/dashboard/reports', icon: BarChart2, visible: RolePermissions[userRole].reports !== 'none' || userRole === 'TEACHER' },
        { name: 'Public Website', href: '/dashboard/website', icon: Globe, visible: RolePermissions[userRole].website !== 'none' && enabledModules.includes('WEBSITE') }
      ]
    },
    {
      name: 'Transport',
      items: [
        { name: 'Routes & Stops', href: '/dashboard/transport/routes', icon: MapPin, visible: (userRole === 'PRINCIPAL' || userRole === 'CLERK') && enabledModules.includes('TRANSPORT') },
        { name: 'Student Transport', href: '/dashboard/transport/students', icon: Bus, visible: userRole !== 'ACCOUNTANT' && enabledModules.includes('TRANSPORT') }
      ]
    },
    {
      name: 'Communications',
      items: [
        { name: 'Notice Board', href: '/dashboard/communications', icon: Bell, visible: userRole !== 'ACCOUNTANT' && enabledModules.includes('COMMUNICATIONS') }
      ]
    },
    {
      name: 'System Settings',
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
    <div className={`flex flex-col bg-slate-900 text-slate-350 transition-all duration-300 border-r border-slate-800 ${collapsed ? 'w-16' : 'w-64'} h-full shrink-0 relative z-30`}>
      {/* Sidebar Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950">
        {!collapsed && (
          <span className="text-[10px] font-extrabold text-white tracking-widest uppercase">
            School ERP v1
          </span>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)} 
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 focus:outline-none ml-auto transition-colors"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Search menu items */}
      {!collapsed && (
        <div className="p-3 border-b border-slate-850">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search menus..."
              className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-primary text-slate-200"
            />
          </div>
        </div>
      )}

      {/* Sidebar Navigation Links */}
      <div className="flex-1 overflow-y-auto py-3 space-y-4 px-2 select-none scrollbar-thin">
        {/* Favorites Group (if any exists) */}
        {!collapsed && favoriteItems.length > 0 && (
          <div className="space-y-1">
            <span className="px-2.5 text-[8.5px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
              Favorites
            </span>
            {favoriteItems.map((item, idx) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link 
                  key={idx}
                  href={item.href}
                  className={`flex items-center justify-between group px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                    isActive 
                      ? 'bg-blue-600 text-white font-semibold' 
                      : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </div>
                  <button 
                    onClick={(e) => toggleFavorite(e, item.href)}
                    className="opacity-0 group-hover:opacity-100 text-amber-400 hover:scale-110 transition-all"
                  >
                    <Star className="h-3.5 w-3.5 fill-current" />
                  </button>
                </Link>
              );
            })}
          </div>
        )}

        {/* Regular Menu Groups */}
        {filteredGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {!collapsed && (
              <span className="px-2.5 text-[8.5px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                {group.name}
              </span>
            )}
            {group.items.map((item, itemIdx) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              const isFav = favorites.includes(item.href);

              return (
                <Link 
                  key={itemIdx}
                  href={item.href}
                  title={collapsed ? item.name : undefined}
                  className={`flex items-center justify-between group px-2.5 py-1.5 rounded-xl text-xs transition-all relative ${
                    isActive 
                      ? 'bg-primary text-white font-semibold' 
                      : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </div>
                  {!collapsed && (
                    <button 
                      onClick={(e) => toggleFavorite(e, item.href)}
                      className={`opacity-0 group-hover:opacity-100 transition-all ${
                        isFav ? 'text-amber-400 opacity-100' : 'text-slate-500 hover:text-amber-400'
                      }`}
                    >
                      <Star className={`h-3.5 w-3.5 ${isFav ? 'fill-current' : ''}`} />
                    </button>
                  )}
                  {collapsed && (
                    <div className="absolute left-16 bg-slate-950 text-white text-[10px] font-bold py-1 px-2.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-40 pointer-events-none uppercase tracking-wider whitespace-nowrap shadow-xl border border-slate-800">
                      {item.name}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
