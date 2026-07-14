import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@school-erp/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAllowedReport } from '@/lib/services/reports-security';
import * as reportsService from '@/lib/services/reports';

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map((header) => {
      const val = row[header];
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') {
        if (val instanceof Date) return val.toISOString();
        return JSON.stringify(val).replace(/"/g, '""');
      }
      const str = String(val);
      const escaped = str.replace(/"/g, '""');
      if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('\r') || escaped.includes('"')) {
        return `"${escaped}"`;
      }
      return escaped;
    });
    rows.push(values.join(','));
  }
  return rows.join('\r\n');
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as string;
  try {
    const body = await request.json();
    const { reportType, filters = {} } = body;

    if (!reportType) {
      return NextResponse.json({ error: 'Report type is required' }, { status: 400 });
    }

    // Determine authorization category
    let category = 'STUDENTS';
    if (
      [
        'FEE_COLLECTIONS',
        'OUTSTANDING_DUES',
        'DAILY_COLLECTION',
        'MONTHLY_COLLECTION',
        'FEE_STATUS',
        'DISCOUNT_SUMMARY',
        'TRANSPORT_REVENUE',
        'EXPENSE_SUMMARY',
        'SALARY_SUMMARY',
        'NET_BALANCE',
      ].includes(reportType)
    ) {
      category = 'FINANCE';
    } else if (
      ['DAILY_ATTENDANCE', 'ABSENTEE_LIST', 'STUDENT_ATTENDANCE_PERCENT', 'CLASS_ATTENDANCE_PERCENT'].includes(
        reportType
      )
    ) {
      category = 'ATTENDANCE';
    } else if (
      ['EXAM_RESULTS', 'CLASS_TOPPERS', 'PASS_PERCENTAGE', 'GRADE_DISTRIBUTION'].includes(reportType)
    ) {
      category = 'RESULTS';
    } else if (
      ['STAFF_REGISTER', 'SALARY_HISTORY', 'ADJUSTMENT_HISTORY', 'MONTHLY_SALARY_SUMMARY', 'DESIGNATION_SUMMARY'].includes(
        reportType
      )
    ) {
      category = 'HR';
    } else if (
      ['ROUTE_UTILIZATION', 'STOP_REVENUE', 'TRANSPORT_ADJUSTMENTS'].includes(reportType)
    ) {
      category = 'TRANSPORT'; // Transport is open to Principal, Clerk, Accountant. Let's make sure.
    }

    if (!isAllowedReport(role, category)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let reportData: any[] = [];

    // Parse dates in filters if any
    const parsedFilters = { ...filters };
    if (filters.startDate) parsedFilters.startDate = new Date(filters.startDate);
    if (filters.endDate) parsedFilters.endDate = new Date(filters.endDate);
    if (filters.date) parsedFilters.date = new Date(filters.date);

    // Call service layer based on reportType
    switch (reportType) {
      case 'STUDENT_REGISTER':
        const reg = await reportsService.getStudentRegister(parsedFilters, 1, 10000, true);
        reportData = reg.data;
        break;
      case 'CLASS_STRENGTH':
        const str = await reportsService.getClassStrengthReport(parsedFilters);
        reportData = str.data.map(d => ({
          Class: d.className,
          Total: d.total,
          Sections: d.sections.map(s => `${s.section}: ${s.count}`).join(' | '),
        }));
        break;
      case 'GENDER_DISTRIBUTION':
        const gen = await reportsService.getGenderDistributionReport(parsedFilters);
        reportData = gen.data;
        break;
      case 'TRANSPORT_USERS':
        const tu = await reportsService.getTransportUsersReport(parsedFilters, 1, 10000, true);
        reportData = tu.data;
        break;
      case 'ADMISSIONS_MONTH':
        const adm = await reportsService.getAdmissionsByMonthReport(parsedFilters);
        reportData = adm.data;
        break;
      case 'DOB_ANALYTICS':
        const dob = await reportsService.getDOBAnalyticsReport(parsedFilters);
        reportData = dob.data;
        break;
      case 'FEE_COLLECTIONS':
        const fc = await reportsService.getFeeCollectionsReport(parsedFilters, 1, 10000, true);
        reportData = fc.data;
        break;
      case 'OUTSTANDING_DUES':
        const od = await reportsService.getOutstandingDuesReport(parsedFilters, 1, 10000, true);
        reportData = od.data;
        break;
      case 'DAILY_COLLECTION':
        const dc = await reportsService.getDailyCollectionReport(parsedFilters.startDate, parsedFilters.endDate);
        reportData = dc.data;
        break;
      case 'MONTHLY_COLLECTION':
        const mc = await reportsService.getMonthlyCollectionReport(parsedFilters.startDate, parsedFilters.endDate);
        reportData = mc.data;
        break;
      case 'FEE_STATUS':
        const fs = await reportsService.getFeeStatusReport();
        reportData = fs.data;
        break;
      case 'DISCOUNT_SUMMARY':
        const ds = await reportsService.getDiscountAndWaiverSummary();
        reportData = ds.data;
        break;
      case 'TRANSPORT_REVENUE':
        const tr = await reportsService.getTransportRevenueReport();
        reportData = tr.data;
        break;
      case 'EXPENSE_SUMMARY':
        const ex = await reportsService.getExpenseSummaryReport(parsedFilters.startDate, parsedFilters.endDate);
        reportData = ex.data;
        break;
      case 'SALARY_SUMMARY':
        const ss = await reportsService.getSalarySummaryReport();
        reportData = ss.data;
        break;
      case 'NET_BALANCE':
        const nb = await reportsService.getNetBalanceReport();
        reportData = [nb];
        break;
      case 'DAILY_ATTENDANCE':
        const da = await reportsService.getDailyAttendanceReport(parsedFilters.date || new Date(), parsedFilters.classId, parsedFilters.sectionId);
        reportData = da.data;
        break;
      case 'ABSENTEE_LIST':
        const abs = await reportsService.getAbsenteeList(parsedFilters.date || new Date(), parsedFilters.classId, parsedFilters.sectionId);
        reportData = abs.data;
        break;
      case 'STUDENT_ATTENDANCE_PERCENT':
        const sap = await reportsService.getStudentAttendancePercent(parsedFilters.classId, parsedFilters.sectionId);
        reportData = sap.data;
        break;
      case 'CLASS_ATTENDANCE_PERCENT':
        const cap = await reportsService.getClassAttendancePercent();
        reportData = cap.data;
        break;
      case 'EXAM_RESULTS':
        if (!parsedFilters.examId) {
          return NextResponse.json({ error: 'Exam ID is required' }, { status: 400 });
        }
        const er = await reportsService.getExamResultsReport(parsedFilters.examId, parsedFilters.classId);
        reportData = er.data.map(d => ({
          studentName: d.studentName,
          admissionNumber: d.admissionNumber,
          className: d.className,
          sectionName: d.sectionName,
          totalObtained: d.totalObtained,
          percentage: d.percentage,
          grade: d.grade,
          rank: d.rank,
        }));
        break;
      case 'CLASS_TOPPERS':
        if (!parsedFilters.examId) {
          return NextResponse.json({ error: 'Exam ID is required' }, { status: 400 });
        }
        const ct = await reportsService.getClassToppers(parsedFilters.examId, parsedFilters.classId);
        reportData = ct.data.map(d => ({
          studentName: d.studentName,
          admissionNumber: d.admissionNumber,
          className: d.className,
          sectionName: d.sectionName,
          totalObtained: d.totalObtained,
          percentage: d.percentage,
          grade: d.grade,
          rank: d.rank,
        }));
        break;
      case 'PASS_PERCENTAGE':
        if (!parsedFilters.examId) {
          return NextResponse.json({ error: 'Exam ID is required' }, { status: 400 });
        }
        const pp = await reportsService.getPassPercentageReport(parsedFilters.examId, parsedFilters.classId);
        reportData = pp.data;
        break;
      case 'GRADE_DISTRIBUTION':
        if (!parsedFilters.examId) {
          return NextResponse.json({ error: 'Exam ID is required' }, { status: 400 });
        }
        const gd = await reportsService.getGradeDistributionReport(parsedFilters.examId, parsedFilters.classId);
        reportData = gd.data;
        break;
      case 'STAFF_REGISTER':
        const strg = await reportsService.getStaffRegister(parsedFilters, 1, 10000, true);
        reportData = strg.data;
        break;
      case 'SALARY_HISTORY':
        const sh = await reportsService.getSalaryHistory(parsedFilters, 1, 10000, true);
        reportData = sh.data;
        break;
      case 'ADJUSTMENT_HISTORY':
        const ah = await reportsService.getAdjustmentHistory(parsedFilters, 1, 10000, true);
        reportData = ah.data;
        break;
      case 'MONTHLY_SALARY_SUMMARY':
        const mss = await reportsService.getMonthlySalarySummary();
        reportData = mss.data;
        break;
      case 'DESIGNATION_SUMMARY':
        const ds_sum = await reportsService.getDesignationSummary();
        reportData = ds_sum.data;
        break;
      case 'ROUTE_UTILIZATION':
        const ru = await reportsService.getRouteUtilizationReport();
        reportData = ru.data;
        break;
      case 'STOP_REVENUE':
        const sr = await reportsService.getStopRevenueReport();
        reportData = sr.data;
        break;
      case 'TRANSPORT_ADJUSTMENTS':
        const ta = await reportsService.getTransportAdjustmentHistory(1, 10000, true);
        reportData = ta.data;
        break;
      default:
        return NextResponse.json({ error: `Invalid report type: ${reportType}` }, { status: 400 });
    }

    // Limit to max 10,000 rows
    const finalReportData = reportData.slice(0, 10000);

    // Write audit log
    await prisma.reportAudit.create({
      data: {
        userId: session.user.id,
        reportType,
        filters: JSON.stringify(filters),
        exported: true,
      },
    });

    const csvContent = convertToCSV(finalReportData);
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `school-report-${todayStr}.csv`;

    return new Response(Buffer.from('\ufeff' + csvContent, 'utf-8'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=${filename}`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
