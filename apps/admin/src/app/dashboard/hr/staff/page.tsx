'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Search, UserPlus, Eye, Power, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import { StaffStatus } from '@prisma/client';

interface StaffItem {
  id: string;
  employeeCode: string;
  name: string;
  mobile: string;
  designation: string;
  qualification: string;
  monthlySalary: number;
  status: StaffStatus;
}

export default function StaffDirectory() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isClerk = userRole === 'CLERK';

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const limit = 20;

  const loadStaff = async () => {
    setIsLoading(true);
    try {
      let url = `/api/hr/staff?page=${page}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (status) url += `&status=${status}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setStaffList(data.items);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Error fetching staff list', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [page, status]);

  // Handle search submit/trigger
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadStaff();
  };

  // Toggle activation status
  const handleToggleStatus = async (id: string, currentStatus: StaffStatus) => {
    if (isClerk) return;
    const nextStatus = currentStatus === StaffStatus.ACTIVE ? StaffStatus.INACTIVE : StaffStatus.ACTIVE;
    const confirmMsg = `Are you sure you want to change status to ${nextStatus}?`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/hr/staff/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        loadStaff();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Soft delete staff
  const handleSoftDelete = async (id: string) => {
    if (isClerk) return;
    if (!confirm('Are you sure you want to soft delete this staff record? It will be hidden from all lists.')) return;

    try {
      const res = await fetch(`/api/hr/staff/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadStaff();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Staff Administration</h1>
          <p className="text-xs text-slate-500">Manage employee directories, onboarding details, and operational status logs.</p>
        </div>
        {!isClerk && (
          <Link href="/dashboard/hr/staff/new" className="erp-btn-primary flex items-center gap-1">
            <UserPlus className="h-4 w-4" />
            <span>Add New Staff</span>
          </Link>
        )}
      </div>

      {/* Sticky Filters row */}
      <div className="erp-card bg-slate-50 border-slate-200">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase">Search Directory</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                className="erp-input pl-9"
                placeholder="Search by name, employee code, mobile..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="w-full md:w-48 space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase">Status Filter</label>
            <select
              className="erp-input"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Active/Inactive</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="erp-btn-primary px-6">
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatus('');
                setPage(1);
                setTimeout(() => loadStaff(), 50);
              }}
              className="erp-btn-secondary"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Dense ERP Table Grid */}
      <div className="erp-card overflow-hidden">
        <div className="overflow-x-auto border border-slate-200 rounded">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-100">
                <th className="erp-table-header">Code</th>
                <th className="erp-table-header">Employee Name</th>
                <th className="erp-table-header">Designation</th>
                <th className="erp-table-header">Mobile</th>
                <th className="erp-table-header">Qualification</th>
                <th className="erp-table-header text-right">Base salary</th>
                <th className="erp-table-header text-center">Status</th>
                <th className="erp-table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-xs text-slate-400">Loading staff records...</td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-xs text-slate-400">No staff found matching search filters.</td>
                </tr>
              ) : (
                staffList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="erp-table-cell font-mono font-semibold">{item.employeeCode}</td>
                    <td className="erp-table-cell font-medium text-slate-900">{item.name}</td>
                    <td className="erp-table-cell">{item.designation}</td>
                    <td className="erp-table-cell font-mono">{item.mobile}</td>
                    <td className="erp-table-cell">{item.qualification}</td>
                    <td className="erp-table-cell text-right font-mono font-semibold">₹{Number(item.monthlySalary).toFixed(2)}</td>
                    <td className="erp-table-cell text-center">
                      <span className={`erp-badge ${item.status === 'ACTIVE' ? 'erp-badge-success' : 'erp-badge-danger'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="erp-table-cell text-right">
                      <div className="flex justify-end gap-1.5">
                        <Link
                          href={`/dashboard/hr/staff/${item.id}`}
                          className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                          title="View Details & Ledger"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        {!isClerk && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(item.id, item.status)}
                              className={`p-1 rounded ${item.status === 'ACTIVE' ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}
                              title={item.status === 'ACTIVE' ? 'Deactivate Employee' : 'Activate Employee'}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSoftDelete(item.id)}
                              className="p-1 rounded text-red-600 hover:bg-red-50"
                              title="Delete Record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Row */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center pt-3 border-t mt-3 text-xs text-slate-500">
            <span>Showing page {page} of {totalPages} ({total} total staff)</span>
            <div className="flex gap-2">
              <button
                type="button"
                className="erp-btn-secondary py-1 px-2.5"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="erp-btn-secondary py-1 px-2.5"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
