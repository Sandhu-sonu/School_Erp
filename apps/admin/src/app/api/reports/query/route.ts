import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@school-erp/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAllowedReport } from '@/lib/services/reports-security';
import * as reportsService from '@/lib/services/reports';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as string;
  try {
    const body = await request.json();
    const { reportType, filters = {}, page = 1, limit = 20 } = body;

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
      category = 'TRANSPORT';
    }

    if (!isAllowedReport(role, category)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let responseData: any;

    // Parse dates in filters if any
    const parsedFilters = { ...filters };
    if (filters.startDate) parsedFilters.startDate = new Date(filters.startDate);
    if (filters.endDate) parsedFilters.endDate = new Date(filters.endDate);
    if (filters.date) parsedFilters.date = new Date(filters.date);

    // Call service layer based on reportType
    switch (reportType) {
      case 'STUDENT_REGISTER':
        responseData = await reportsService.getStudentRegister(parsedFilters, page, limit);
        break;
      case 'CLASS_STRENGTH':
        responseData = await reportsService.getClassStrengthReport(parsedFilters);
        break;
      case 'GENDER_DISTRIBUTION':
        responseData = await reportsService.getGenderDistributionReport(parsedFilters);
        break;
      case 'TRANSPORT_USERS':
        responseData = await reportsService.getTransportUsersReport(parsedFilters, page, limit);
        break;
      case 'ADMISSIONS_MONTH':
        responseData = await reportsService.getAdmissionsByMonthReport(parsedFilters);
        break;
      case 'DOB_ANALYTICS':
        responseData = await reportsService.getDOBAnalyticsReport(parsedFilters);
        break;
      case 'FEE_COLLECTIONS':
        responseData = await reportsService.getFeeCollectionsReport(parsedFilters, page, limit);
        break;
      case 'OUTSTANDING_DUES':
        responseData = await reportsService.getOutstandingDuesReport(parsedFilters, page, limit);
        break;
      case 'DAILY_COLLECTION':
        responseData = await reportsService.getDailyCollectionReport(parsedFilters.startDate, parsedFilters.endDate);
        break;
      case 'MONTHLY_COLLECTION':
        responseData = await reportsService.getMonthlyCollectionReport(parsedFilters.startDate, parsedFilters.endDate);
        break;
      case 'FEE_STATUS':
        responseData = await reportsService.getFeeStatusReport();
        break;
      case 'DISCOUNT_SUMMARY':
        responseData = await reportsService.getDiscountAndWaiverSummary();
        break;
      case 'TRANSPORT_REVENUE':
        responseData = await reportsService.getTransportRevenueReport();
        break;
      case 'EXPENSE_SUMMARY':
        responseData = await reportsService.getExpenseSummaryReport(parsedFilters.startDate, parsedFilters.endDate);
        break;
      case 'SALARY_SUMMARY':
        responseData = await reportsService.getSalarySummaryReport();
        break;
      case 'NET_BALANCE':
        const nb = await reportsService.getNetBalanceReport();
        responseData = {
          data: [nb],
          summary: {},
          pagination: { total: 1, page: 1, limit: 1, totalPages: 1 },
        };
        break;
      case 'DAILY_ATTENDANCE':
        responseData = await reportsService.getDailyAttendanceReport(parsedFilters.date || new Date(), parsedFilters.classId, parsedFilters.sectionId);
        break;
      case 'ABSENTEE_LIST':
        responseData = await reportsService.getAbsenteeList(parsedFilters.date || new Date(), parsedFilters.classId, parsedFilters.sectionId);
        break;
      case 'STUDENT_ATTENDANCE_PERCENT':
        responseData = await reportsService.getStudentAttendancePercent(parsedFilters.classId, parsedFilters.sectionId);
        break;
      case 'CLASS_ATTENDANCE_PERCENT':
        responseData = await reportsService.getClassAttendancePercent();
        break;
      case 'EXAM_RESULTS':
        if (!parsedFilters.examId) {
          return NextResponse.json({ error: 'Exam ID is required' }, { status: 400 });
        }
        responseData = await reportsService.getExamResultsReport(parsedFilters.examId, parsedFilters.classId);
        break;
      case 'CLASS_TOPPERS':
        if (!parsedFilters.examId) {
          return NextResponse.json({ error: 'Exam ID is required' }, { status: 400 });
        }
        responseData = await reportsService.getClassToppers(parsedFilters.examId, parsedFilters.classId);
        break;
      case 'PASS_PERCENTAGE':
        if (!parsedFilters.examId) {
          return NextResponse.json({ error: 'Exam ID is required' }, { status: 400 });
        }
        responseData = await reportsService.getPassPercentageReport(parsedFilters.examId, parsedFilters.classId);
        break;
      case 'GRADE_DISTRIBUTION':
        if (!parsedFilters.examId) {
          return NextResponse.json({ error: 'Exam ID is required' }, { status: 400 });
        }
        responseData = await reportsService.getGradeDistributionReport(parsedFilters.examId, parsedFilters.classId);
        break;
      case 'STAFF_REGISTER':
        responseData = await reportsService.getStaffRegister(parsedFilters, page, limit);
        break;
      case 'SALARY_HISTORY':
        responseData = await reportsService.getSalaryHistory(parsedFilters, page, limit);
        break;
      case 'ADJUSTMENT_HISTORY':
        responseData = await reportsService.getAdjustmentHistory(parsedFilters, page, limit);
        break;
      case 'MONTHLY_SALARY_SUMMARY':
        responseData = await reportsService.getMonthlySalarySummary();
        break;
      case 'DESIGNATION_SUMMARY':
        responseData = await reportsService.getDesignationSummary();
        break;
      case 'ROUTE_UTILIZATION':
        responseData = await reportsService.getRouteUtilizationReport();
        break;
      case 'STOP_REVENUE':
        responseData = await reportsService.getStopRevenueReport();
        break;
      case 'TRANSPORT_ADJUSTMENTS':
        responseData = await reportsService.getTransportAdjustmentHistory(page, limit);
        break;
      default:
        return NextResponse.json({ error: `Invalid report type: ${reportType}` }, { status: 400 });
    }

    // Write audit log for report view generation
    await prisma.reportAudit.create({
      data: {
        userId: session.user.id,
        reportType,
        filters: JSON.stringify(filters),
        exported: false,
      },
    });

    return NextResponse.json(responseData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
