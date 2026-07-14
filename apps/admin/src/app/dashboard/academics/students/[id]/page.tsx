import React from 'react';
import { getStudentById } from '@/lib/services/admissions';
import { notFound } from 'next/navigation';
import StudentProfileClient from './StudentProfileClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentProfilePage({ params }: PageProps) {
  const { id } = await params;
  const student = await getStudentById(id);

  if (!student) {
    notFound();
  }

  // Calculate student age from DOB
  const dobTime = new Date(student.dob).getTime();
  const diffMs = new Date().getTime() - dobTime;
  const age = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Student Profile Console</h1>
        <p className="text-xs text-slate-500">Inspect academic enrollments, financial ledgers, and attendance states.</p>
      </div>

      {/* Profile Detail Console */}
      <StudentProfileClient student={student} calculatedAge={age} />
    </div>
  );
}
