import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@school-erp/db';
import { getStudentDashboardSummary } from '@/lib/services/parent-portal';
import { Calendar, CreditCard, Award, Bell, Shield, MapPin, User, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const TRANSLATIONS: Record<string, Record<string, string>> = {
  English: {
    noStudentsTitle: 'No Associated Students',
    noStudentsDesc: 'There are no active student profiles associated with your mobile number.',
    accessDenied: 'Access Denied. Student profile not associated with this account.',
    outstandingFees: 'Outstanding Fees',
    latestExamStanding: 'Latest Exam Standing',
    score: 'Score',
    grade: 'Grade',
    noResults: 'No exam results published yet.',
    schoolNotices: 'School Notices',
    noNotices: 'No notices posted recently.',
    holidaysEvents: 'Holidays & Events',
    noEvents: 'No upcoming events scheduled.',
    class: 'Class',
    adm: 'Adm'
  },
  Hindi: {
    noStudentsTitle: 'कोई संबद्ध छात्र नहीं है',
    noStudentsDesc: 'आपके मोबाइल नंबर से संबद्ध कोई सक्रिय छात्र प्रोफ़ाइल नहीं है।',
    accessDenied: 'प्रवेश निषेध। छात्र प्रोफ़ाइल इस खाते से संबद्ध नहीं है।',
    outstandingFees: 'बकाया शुल्क',
    latestExamStanding: 'नवीनतम परीक्षा परिणाम',
    score: 'अंक',
    grade: 'ग्रेड',
    noResults: 'अभी तक कोई परीक्षा परिणाम घोषित नहीं हुआ है।',
    schoolNotices: 'स्कूल की सूचनाएं',
    noNotices: 'हाल ही में कोई सूचना पोस्ट नहीं की गई है।',
    holidaysEvents: 'छुट्टियां और कार्यक्रम',
    noEvents: 'कोई आगामी कार्यक्रम निर्धारित नहीं है।',
    class: 'कक्षा',
    adm: 'प्रवेश संख्या'
  },
  Punjabi: {
    noStudentsTitle: 'ਕੋਈ ਸਬੰਧਤ ਵਿਦਿਆਰਥੀ ਨਹੀਂ',
    noStudentsDesc: 'ਤੁਹਾਡੇ ਮੋਬਾਈਲ ਨੰਬਰ ਨਾਲ ਕੋਈ ਵੀ ਸਰਗਰਮ ਵਿਦਿਆਰਥੀ ਪ੍ਰੋਫਾਈਲ ਨਹੀਂ ਜੁੜਿਆ ਹੋਇਆ ਹੈ।',
    accessDenied: 'ਪਹੁੰਚ ਦੀ ਮਨਾਹੀ। ਵਿਦਿਆਰਥੀ ਪ੍ਰੋਫਾਈਲ ਇਸ ਖਾਤੇ ਨਾਲ ਸਬੰਧਤ ਨਹੀਂ ਹੈ।',
    outstandingFees: 'ਬਾਕੀ ਫੀਸ',
    latestExamStanding: 'ਤਾਜ਼ਾ ਪ੍ਰੀਖਿਆ ਨਤੀਜਾ',
    score: 'ਅੰਕ',
    grade: 'ਗ੍ਰੇਡ',
    noResults: 'ਅਜੇ ਤੱਕ ਕੋਈ ਪ੍ਰੀਖਿਆ ਨਤੀਜਾ ਘੋਸ਼ਿਤ ਨਹੀਂ ਹੋਇਆ ਹੈ।',
    schoolNotices: 'ਸਕੂਲ ਨੋਟਿਸ',
    noNotices: 'ਹਾਲ ਹੀ ਵਿੱਚ ਕੋਈ ਨੋਟਿਸ ਨਹੀਂ ਭੇਜਿਆ ਗਿਆ।',
    holidaysEvents: 'ਛੁੱਟੀਆਂ ਅਤੇ ਸਮਾਗਮ',
    noEvents: 'ਕੋਈ ਆਉਣ ਵਾਲਾ ਸਮਾਗਮ ਤੈਅ ਨਹੀਂ ਹੈ।',
    class: 'ਜਮਾਤ',
    adm: 'ਦਾਖਲਾ ਨੰਬਰ'
  }
};

export default async function PortalDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const cookieStore = await cookies();
  const parentId = cookieStore.get('parent_session')?.value;
  const language = cookieStore.get('language')?.value || 'English';

  const t = (key: string) => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS['English']?.[key] || key;
  };

  if (!parentId) {
    redirect('/portal/login');
  }

  const { studentId } = await searchParams;

  let activeStudentId = studentId;

  // Fallback: If studentId query parameter is not present, select first student linked to parent
  if (!activeStudentId) {
    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      include: { students: { where: { status: 'ACTIVE' }, take: 1 } }
    });
    if (parent && parent.students.length > 0) {
      activeStudentId = parent.students[0].id;
    }
  }

  if (!activeStudentId) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
        <User className="h-12 w-12 text-slate-400 mb-3" />
        <h3 className="font-bold text-slate-700">{t('noStudentsTitle')}</h3>
        <p className="text-xs text-slate-450 mt-1">{t('noStudentsDesc')}</p>
      </div>
    );
  }

  // Security check: Verify student is associated with parent session
  const validStudent = await prisma.student.findFirst({
    where: { id: activeStudentId, parentId }
  });

  if (!validStudent) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-medium text-center">
        {t('accessDenied')}
      </div>
    );
  }

  const summary = await getStudentDashboardSummary(activeStudentId);

  const buildUrl = (targetPath: string) => {
    return `${targetPath}?studentId=${activeStudentId}`;
  };

  return (
    <div className="space-y-5 select-none pb-4">
      {/* Student Profile QuickCard */}
      <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-750 text-white rounded-2xl shadow-md flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center border border-white/30 shrink-0 font-bold text-sm">
          {summary.student.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold truncate">{summary.student.name}</h2>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-blue-200 font-semibold mt-0.5">
            <span>{t('class')}: {summary.enrollment.class} - {summary.enrollment.section}</span>
            <span>•</span>
            <span>{t('adm')}: {summary.student.admissionNumber}</span>
          </div>
        </div>
      </div>

      {/* Outstanding Fees Box */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex justify-between items-center hover:border-slate-300 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded bg-amber-50 text-amber-600">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{t('outstandingFees')}</p>
            <h3 className="text-sm font-bold text-slate-800 mt-0.5">
              ₹{summary.feeSummary ? summary.feeSummary.remainingFee.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
            </h3>
          </div>
        </div>
        <Link href={buildUrl('/portal/fees')} className="p-1 rounded bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-500">
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Latest Published Exam Result Box */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-colors">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-green-50 text-green-600">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{t('latestExamStanding')}</p>
              {summary.latestResultSummary ? (
                <div>
                  <h3 className="text-xs font-bold text-slate-800 mt-0.5">{summary.latestResultSummary.examName}</h3>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                    {t('score')}: {summary.latestResultSummary.percentage.toFixed(1)}% | {t('grade')}: {summary.latestResultSummary.finalGrade}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-medium mt-1">{t('noResults')}</p>
              )}
            </div>
          </div>
          {summary.latestResultSummary && (
            <Link href={buildUrl('/portal/results')} className="p-1 rounded bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-500">
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Latest notices (max 5) */}
      <div className="space-y-2">
        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Bell className="h-3.5 w-3.5 text-slate-450" />
          {t('schoolNotices')}
        </h2>
        {summary.notices.length === 0 ? (
          <div className="p-4 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-400 font-medium bg-white">
            {t('noNotices')}
          </div>
        ) : (
          <div className="space-y-2">
            {summary.notices.map((n) => (
              <div key={n.id} className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                <span className="text-[8px] font-bold text-blue-600 uppercase tracking-wide">
                  {new Date(n.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                </span>
                <h4 className="text-xs font-bold text-slate-800 mt-0.5">{n.title}</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{n.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Holidays/Events (max 5) */}
      <div className="space-y-2">
        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-slate-450" />
          {t('holidaysEvents')}
        </h2>
        {summary.calendarEvents.length === 0 ? (
          <div className="p-4 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-400 font-medium bg-white">
            {t('noEvents')}
          </div>
        ) : (
          <div className="space-y-2 bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden shadow-sm">
            {summary.calendarEvents.map((e) => (
              <div key={e.id} className="p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 truncate">{e.title}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">{e.description}</p>
                </div>
                <span className="text-[9px] font-semibold text-slate-450 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 shrink-0">
                  {new Date(e.date).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
