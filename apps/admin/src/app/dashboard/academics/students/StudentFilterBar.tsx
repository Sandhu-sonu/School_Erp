'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search } from 'lucide-react';

interface ClassOption {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

interface FilterProps {
  classes: ClassOption[];
  currentFilters: {
    search: string;
    classId: string;
    sectionId: string;
    status: string;
  };
}

export default function StudentFilterBar({ classes, currentFilters }: FilterProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState(currentFilters.search);
  const [classId, setClassId] = useState(currentFilters.classId);
  const [sectionId, setSectionId] = useState(currentFilters.sectionId);
  const [status, setStatus] = useState(currentFilters.status);

  const applyFilters = (newFilters: Partial<typeof currentFilters>) => {
    const active = {
      search: newFilters.search !== undefined ? newFilters.search : search,
      classId: newFilters.classId !== undefined ? newFilters.classId : classId,
      sectionId: newFilters.sectionId !== undefined ? newFilters.sectionId : sectionId,
      status: newFilters.status !== undefined ? newFilters.status : status,
    };

    const params = new URLSearchParams();
    if (active.search) params.set('search', active.search);
    if (active.classId) params.set('classId', active.classId);
    if (active.sectionId) params.set('sectionId', active.sectionId);
    if (active.status) params.set('status', active.status);

    router.push(`${pathname}?${params.toString()}`);
  };

  const selectedClass = classes.find((c) => c.id === classId);
  const sections = selectedClass ? selectedClass.sections : [];

  return (
    <div className="erp-card grid grid-cols-1 gap-3 sm:grid-cols-4 items-end">
      {/* Search Input */}
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase">Search Student</label>
        <div className="mt-1 relative rounded shadow-sm">
          <input
            type="text"
            placeholder="Search by name, admn no..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              applyFilters({ search: e.target.value });
            }}
            className="erp-input pl-7"
          />
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <Search className="h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Class Filter */}
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase">Filter Class</label>
        <select
          value={classId}
          onChange={(e) => {
            const val = e.target.value;
            setClassId(val);
            setSectionId('');
            applyFilters({ classId: val, sectionId: '' });
          }}
          className="erp-input mt-1"
        >
          <option value="">-- All Classes --</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Section Filter */}
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase">Filter Section</label>
        <select
          value={sectionId}
          onChange={(e) => {
            const val = e.target.value;
            setSectionId(val);
            applyFilters({ sectionId: val });
          }}
          className="erp-input mt-1"
          disabled={!classId}
        >
          <option value="">-- All Sections --</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              Section {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Status Filter */}
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase">Filter Status</label>
        <select
          value={status}
          onChange={(e) => {
            const val = e.target.value;
            setStatus(val);
            applyFilters({ status: val });
          }}
          className="erp-input mt-1"
        >
          <option value="">-- Active & Inactive --</option>
          <option value="ACTIVE">Active</option>
          <option value="TRANSFERRED">Transferred</option>
          <option value="DROPPED">Dropped</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="ALUMNI">Alumni</option>
        </select>
      </div>
    </div>
  );
}
