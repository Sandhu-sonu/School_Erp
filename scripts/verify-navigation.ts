import fs from 'fs';
import path from 'path';
import { prisma, setTransactionClient, clearTransactionClient } from '../packages/db/src';
import { getDashboardData } from '../apps/admin/src/lib/services/dashboard';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ ASSERTION PASSED: ${message}`);
  }
}

async function verifyRoutesExist() {
  console.log('\n--- 1. Verifying Filesystem Pages for Sidebar Routes ---');

  const sidebarRoutes = [
    '/dashboard',
    '/dashboard/academics/students',
    '/dashboard/academics/sessions',
    '/dashboard/academics/classes',
    '/dashboard/academics/subjects',
    '/dashboard/academics/timetable',
    '/dashboard/academics/promotions',
    '/dashboard/exams',
    '/dashboard/results',
    '/dashboard/admissions/registration',
    '/dashboard/admissions/leads',
    '/dashboard/finance/ledger',
    '/dashboard/finance/expenses',
    '/dashboard/finance/fees',
    '/dashboard/hr/staff',
    '/dashboard/hr/salary',
    '/dashboard/reports/hr',
    '/dashboard/operations/attendance',
    '/dashboard/reports',
    '/dashboard/website',
    '/dashboard/transport/routes',
    '/dashboard/transport/students',
    '/dashboard/communications',
    '/dashboard/system/settings',
    '/dashboard/system/health',
  ];

  const appDir = path.join(process.cwd(), 'apps', 'admin', 'src', 'app');

  for (const route of sidebarRoutes) {
    const relativePath = route.substring(1);
    const pagePath = path.join(appDir, relativePath, 'page.tsx');
    const exists = fs.existsSync(pagePath);
    assert(exists, `Page file should exist at ${pagePath}`);
  }
}

function verifyHrReportsRedirect() {
  console.log('\n--- 2. Verifying HR Reports Page Redirect ---');
  const redirectPagePath = path.join(process.cwd(), 'apps', 'admin', 'src', 'app', 'dashboard', 'hr', 'reports', 'page.tsx');
  assert(fs.existsSync(redirectPagePath), `Redirect page must exist at ${redirectPagePath}`);

  const content = fs.readFileSync(redirectPagePath, 'utf-8');
  assert(content.includes("redirect('/dashboard/reports/hr')"), "Redirect page must perform redirect to '/dashboard/reports/hr'");
}

async function verifyDashboardPerformance() {
  console.log('\n--- 3. Verifying Dashboard Aggregation Query Performance ---');
  
  let activeSession = await prisma.academicSession.findUnique({ where: { name: '2026-27' } });
  if (!activeSession) {
    await prisma.academicSession.create({
      data: {
        name: '2026-27',
        isActive: true,
        startDate: new Date('2026-04-01'),
        endDate: new Date('2027-03-31'),
      }
    });
  }

  const start = Date.now();
  const data = await getDashboardData();
  const duration = Date.now() - start;

  assert(data.activeStudentsCount !== undefined, 'Should return activeStudentsCount');
  assert(data.leadsCount !== undefined, 'Should return leadsCount');
  assert(data.totalCollected !== undefined, 'Should return totalCollected');
  assert(data.totalPending !== undefined, 'Should return totalPending');
  assert(data.transportRevenue !== undefined, 'Should return transportRevenue');
  assert(data.studentsUsingTransport !== undefined, 'Should return studentsUsingTransport');
  assert(data.publishedNoticesCount !== undefined, 'Should return publishedNoticesCount');
  assert(data.newAdmissionsCount !== undefined, 'Should return newAdmissionsCount');
  assert(Array.isArray(data.recentLogs), 'Should return recentLogs array');
  assert(Array.isArray(data.classes), 'Should return classes array');

  console.log(`Dashboard single-sweep transaction execution time: ${duration}ms`);
  assert(duration < 300, `Dashboard loading time must be under 300ms (actual: ${duration}ms)`);
}

async function runVerification() {
  console.log('🚀 Starting Navigation & Stabilization Verification...');
  const start = Date.now();

  await verifyRoutesExist();
  verifyHrReportsRedirect();
  await verifyDashboardPerformance();

  const totalDuration = Date.now() - start;
  console.log(`\n🎉 Pre-launch stabilization check completed successfully in ${totalDuration}ms!`);
}

async function main() {
  try {
    await prisma.$transaction(async (tx) => {
      setTransactionClient(tx);
      await runVerification();
      throw new Error('ROLLBACK');
    }, {
      timeout: 30000
    });
  } catch (err: any) {
    clearTransactionClient();
    if (err.message === 'ROLLBACK') {
      console.log('✅ Rollback successful. Database state preserved.');
    } else {
      console.error('❌ Verification failed:', err);
      process.exit(1);
    }
  }
}

main();
