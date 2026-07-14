import React from 'react';
import { prisma } from '@school-erp/db';
import { BarChart, UserCheck, PhoneCall, CheckSquare } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  // Query leads from PostgreSQL
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    include: { class: { select: { name: true } } },
  });

  // Calculate status aggregates
  const stats = {
    NEW: leads.filter((l) => l.status === 'NEW').length,
    CONTACTED: leads.filter((l) => l.status === 'CONTACTED').length,
    VISITED: leads.filter((l) => l.status === 'VISITED').length,
    ADMITTED: leads.filter((l) => l.status === 'ADMITTED').length,
    CLOSED: leads.filter((l) => l.status === 'CLOSED').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Admissions CRM Leads</h1>
        <p className="text-xs text-slate-500">Track student registration inquiries, leads pipeline, and follow-ups.</p>
      </div>

      {/* Aggregate Status Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="erp-card flex items-center gap-2">
          <div className="p-1 rounded bg-blue-50 text-blue-700">
            <BarChart className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase">New Inquiries</p>
            <h4 className="text-sm font-bold text-slate-800">{stats.NEW}</h4>
          </div>
        </div>

        <div className="erp-card flex items-center gap-2">
          <div className="p-1 rounded bg-yellow-50 text-yellow-700">
            <PhoneCall className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase">Contacted</p>
            <h4 className="text-sm font-bold text-slate-800">{stats.CONTACTED}</h4>
          </div>
        </div>

        <div className="erp-card flex items-center gap-2">
          <div className="p-1 rounded bg-orange-50 text-orange-700">
            <UserCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase">Visited</p>
            <h4 className="text-sm font-bold text-slate-800">{stats.VISITED}</h4>
          </div>
        </div>

        <div className="erp-card flex items-center gap-2">
          <div className="p-1 rounded bg-green-50 text-green-700">
            <CheckSquare className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase">Admitted</p>
            <h4 className="text-sm font-bold text-slate-800">{stats.ADMITTED}</h4>
          </div>
        </div>

        <div className="erp-card flex items-center gap-2">
          <div className="p-1 rounded bg-red-50 text-red-700">
            <AlertCircle className="h-4 w-4 text-red-700" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase">Closed / Lost</p>
            <h4 className="text-sm font-bold text-slate-800">{stats.CLOSED}</h4>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="erp-card">
        <div className="overflow-x-auto border border-slate-200 rounded">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50">
                <th className="erp-table-header">Student Name</th>
                <th className="erp-table-header">Parent Name</th>
                <th className="erp-table-header">Mobile</th>
                <th className="erp-table-header">Class Level</th>
                <th className="erp-table-header">Status</th>
                <th className="erp-table-header">Inquiry Date</th>
                <th className="erp-table-header">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-xs text-slate-400">
                    No active CRM admission leads recorded.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  let statusBadge = 'erp-badge-success';
                  if (lead.status === 'NEW') statusBadge = 'bg-blue-100 text-blue-800 erp-badge';
                  else if (lead.status === 'CONTACTED') statusBadge = 'erp-badge-warning';
                  else if (lead.status === 'VISITED') statusBadge = 'bg-orange-100 text-orange-800 erp-badge';
                  else if (lead.status === 'CLOSED') statusBadge = 'erp-badge-danger';

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/50">
                      <td className="erp-table-cell font-medium text-slate-900">{lead.studentName}</td>
                      <td className="erp-table-cell">{lead.parentName}</td>
                      <td className="erp-table-cell font-mono">{lead.mobile}</td>
                      <td className="erp-table-cell font-semibold">{lead.class.name}</td>
                      <td className="erp-table-cell">
                        <span className={statusBadge}>{lead.status}</span>
                      </td>
                      <td className="erp-table-cell">{new Date(lead.createdAt).toLocaleDateString()}</td>
                      <td className="erp-table-cell italic max-w-xs truncate">{lead.notes || 'None'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
// Small helper since lucide-react doesn't expose it inside React Server Components if not imported
function AlertCircle({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
