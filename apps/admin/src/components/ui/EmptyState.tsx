import React from 'react';
import { Inbox, Users, HelpCircle, GraduationCap, Bus, Bell, CreditCard } from 'lucide-react';

interface EmptyStateProps {
  type: 'students' | 'staff' | 'parents' | 'fees' | 'results' | 'transport' | 'notices' | 'generic';
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ type, title, description, action }: EmptyStateProps) {
  const configs = {
    students: {
      icon: GraduationCap,
      title: 'No Students Admitted',
      description: 'Get started by registering a new student profile in the admissions center.',
      color: 'text-blue-500 bg-blue-50 border-blue-100'
    },
    staff: {
      icon: Users,
      title: 'No Employee Staff Added',
      description: 'Configure and add new teachers, administrators, or support staff profiles.',
      color: 'text-purple-500 bg-purple-50 border-purple-100'
    },
    parents: {
      icon: Users,
      title: 'No Guardian Records Found',
      description: 'Add new parent contact accounts to link with active student profiles.',
      color: 'text-indigo-500 bg-indigo-50 border-indigo-100'
    },
    fees: {
      icon: CreditCard,
      title: 'No Fee Invoices Collected',
      description: 'No payments have been received for the active session billing accounts.',
      color: 'text-green-500 bg-green-50 border-green-100'
    },
    results: {
      icon: Inbox,
      title: 'No Exam Marks Published',
      description: 'Publish exam record cards or compile grading configurations to view reports.',
      color: 'text-amber-500 bg-amber-50 border-amber-100'
    },
    transport: {
      icon: Bus,
      title: 'No Transport Routes Assigned',
      description: 'Configure bus routes, local stops, or allocate transport fees.',
      color: 'text-rose-500 bg-rose-50 border-rose-100'
    },
    notices: {
      icon: Bell,
      title: 'Notice Board is Empty',
      description: 'No notifications or announcements have been posted for this class target.',
      color: 'text-amber-500 bg-amber-50 border-amber-100'
    },
    generic: {
      icon: HelpCircle,
      title: 'No Records Found',
      description: 'There are no active records registered matching the current selection.',
      color: 'text-slate-400 bg-slate-50 border-slate-100'
    }
  };

  const selected = configs[type] || configs.generic;
  const Icon = selected.icon;

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-slate-200 border-dashed rounded-2xl bg-white space-y-4 max-w-sm mx-auto my-6 animate-in fade-in duration-200">
      <div className={`p-4 rounded-full border-2 ${selected.color}`}>
        <Icon className="h-8 w-8" />
      </div>
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">{title || selected.title}</h4>
        <p className="text-[11px] text-slate-455 font-medium leading-relaxed max-w-xs">{description || selected.description}</p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
export default EmptyState;
