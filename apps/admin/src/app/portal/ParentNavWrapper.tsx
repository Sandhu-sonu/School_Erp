'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Home, Award, CreditCard, Calendar, User, LogOut, ChevronDown, Shield } from 'lucide-react';

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

export default function ParentNavWrapper({ parent, children }: ParentNavWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentStudentId = searchParams.get('studentId');

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const students = parent?.students || [];

  useEffect(() => {
    if (students.length > 0) {
      if (!currentStudentId) {
        // Automatically default to the first student if query param is missing
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

  if (!parent) return <>{children}</>;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 pb-16 select-none max-w-md mx-auto border-x border-slate-200 shadow-md relative">
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white px-4 py-3 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-400 shrink-0" />
          <div>
            <h1 className="text-xs font-bold tracking-wider uppercase">Parent Portal</h1>
            <p className="text-[9px] text-slate-400">{parent.fatherName || 'Parent'}</p>
          </div>
        </div>

        {/* Child Selection Dropdown */}
        {students.length > 0 && activeStudent && (
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-xs font-bold text-slate-200 transition-colors"
            >
              <span>{activeStudent.name}</span>
              <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white text-slate-800 rounded-lg border border-slate-200 shadow-lg py-1 overflow-hidden z-50">
                {students.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => handleStudentChange(student.id)}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-slate-50 flex flex-col ${
                      student.id === selectedStudentId ? 'bg-blue-50 text-blue-700 font-semibold' : ''
                    }`}
                  >
                    <span>{student.name}</span>
                    <span className="text-[9px] text-slate-400 font-medium">Adm No: {student.admissionNumber}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 overflow-y-auto">
        {children}
      </main>

      {/* Bottom PWA Style Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-white border-t border-slate-200 shadow-lg px-2 py-1.5 flex justify-between items-center text-slate-500">
        <Link 
          href={buildUrl('/portal/dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors ${
            pathname === '/portal/dashboard' ? 'text-blue-600 font-semibold' : 'hover:text-slate-700'
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[9px] mt-0.5">Home</span>
        </Link>

        <Link 
          href={buildUrl('/portal/results')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors ${
            pathname === '/portal/results' ? 'text-blue-600 font-semibold' : 'hover:text-slate-700'
          }`}
        >
          <Award className="h-5 w-5" />
          <span className="text-[9px] mt-0.5">Results</span>
        </Link>

        <Link 
          href={buildUrl('/portal/fees')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors ${
            pathname === '/portal/fees' ? 'text-blue-600 font-semibold' : 'hover:text-slate-700'
          }`}
        >
          <CreditCard className="h-5 w-5" />
          <span className="text-[9px] mt-0.5">Fees</span>
        </Link>

        <Link 
          href={buildUrl('/portal/calendar')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors ${
            pathname === '/portal/calendar' ? 'text-blue-600 font-semibold' : 'hover:text-slate-700'
          }`}
        >
          <Calendar className="h-5 w-5" />
          <span className="text-[9px] mt-0.5">Events</span>
        </Link>

        <Link 
          href={buildUrl('/portal/profile')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors ${
            pathname === '/portal/profile' ? 'text-blue-600 font-semibold' : 'hover:text-slate-700'
          }`}
        >
          <User className="h-5 w-5" />
          <span className="text-[9px] mt-0.5">Profile</span>
        </Link>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex flex-col items-center justify-center flex-1 py-1 text-center text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
          title="Log Out"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-[9px] mt-0.5">Exit</span>
        </button>
      </nav>
    </div>
  );
}
