import React from 'react';
import { prisma } from '@school-erp/db';
import { getStudents } from '@/lib/services/admissions';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import StudentFilterBar from './StudentFilterBar';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    classId?: string;
    sectionId?: string;
    status?: string;
  }>;
}

export default async function StudentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search || '';
  const classId = params.classId || '';
  const sectionId = params.sectionId || '';
  const status = params.status || '';

  // Fetch students based on filters
  const students = await getStudents({ search, classId, sectionId, status });

  // Fetch classes and sections for filters
  const classes = await prisma.class.findMany({
    orderBy: { sequence: 'asc' },
    include: { sections: { orderBy: { name: 'asc' } } },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Student Directory</h1>
          <p className="text-xs text-slate-500">Manage student profiles, lookups, and lifecycle states.</p>
        </div>
        <Link href="/dashboard/admissions/registration" className="erp-btn-primary">
          Admit New Student
        </Link>
      </div>

      {/* Filter Bar */}
      <StudentFilterBar classes={classes} currentFilters={{ search, classId, sectionId, status }} />

      {/* Dense ERP Table */}
      <div className="erp-card overflow-hidden">
        <div className="overflow-x-auto border border-slate-200 rounded">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50">
                <th className="erp-table-header">Admn No</th>
                <th className="erp-table-header">Student Name</th>
                <th className="erp-table-header">Class & Sec</th>
                <th className="erp-table-header">Father Name</th>
                <th className="erp-table-header">Mobile</th>
                <th className="erp-table-header">Status</th>
                <th className="erp-table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-xs text-slate-400">
                    No student records found matching the active filters.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const activeEnrollment = student.enrollments[0];
                  const className = activeEnrollment?.class?.name || 'Unassigned';
                  const sectionName = activeEnrollment?.section?.name ? ` - ${activeEnrollment.section.name}` : '';

                  let statusBadge = 'erp-badge-success';
                  if (student.status === 'TRANSFERRED') statusBadge = 'bg-blue-100 text-blue-800 erp-badge';
                  else if (student.status === 'DROPPED') statusBadge = 'erp-badge-danger';
                  else if (student.status === 'SUSPENDED') statusBadge = 'erp-badge-warning';
                  else if (student.status === 'ALUMNI') statusBadge = 'bg-purple-100 text-purple-800 erp-badge';
                  else if (student.status === 'DELETED') statusBadge = 'bg-slate-100 text-slate-800 erp-badge';

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50">
                      <td className="erp-table-cell font-mono font-semibold">{student.admissionNumber}</td>
                      <td className="erp-table-cell font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          {student.photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={student.photo.startsWith('/') ? student.photo : `/uploads/${student.photo}`}
                              alt={student.name}
                              className="h-6 w-6 rounded-full object-cover border"
                            />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center border text-[9px] text-slate-500 font-bold uppercase shrink-0">
                              {student.name.charAt(0)}
                            </div>
                          )}
                          <span>{student.name}</span>
                        </div>
                      </td>
                      <td className="erp-table-cell">{className}{sectionName}</td>
                      <td className="erp-table-cell">{student.parent.fatherName}</td>
                      <td className="erp-table-cell font-mono">{student.parent.mobile}</td>
                      <td className="erp-table-cell">
                        <span className={statusBadge}>{student.status}</span>
                      </td>
                      <td className="erp-table-cell text-right">
                        <div className="flex justify-end gap-1.5">
                          <Link
                            href={`/dashboard/academics/students/${student.id}`}
                            className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                            title="View Profile"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
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
