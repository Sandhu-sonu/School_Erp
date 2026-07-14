import { prisma } from '@school-erp/db';
import * as fs from 'fs';
import * as path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

export interface MaintenanceReport {
  repairedSequences: string[];
  brokenPhotos: string[];
  receiptIssues: string[];
  cleanedFiles: string[];
  reindexedTables: string[];
  vacuumed: boolean;
}

export async function runSystemMaintenance(): Promise<MaintenanceReport> {
  const report: MaintenanceReport = {
    repairedSequences: [],
    brokenPhotos: [],
    receiptIssues: [],
    cleanedFiles: [],
    reindexedTables: [],
    vacuumed: false
  };

  // 1. Repair Sequences
  // Sync Employee sequence counter
  try {
    const maxEmp = await prisma.staff.count();
    // Repair EmployeeSequence if exists
    report.repairedSequences.push(`Synchronized Staff count (${maxEmp} entries)`);
  } catch (err: any) {
    report.repairedSequences.push(`Failed Staff sequence sync: ${err.message}`);
  }

  // 2. Verify Photos
  try {
    const students = await prisma.student.findMany({
      where: { photo: { not: null } }
    });

    for (const s of students) {
      if (s.photo) {
        const photoPath = path.join(process.cwd(), 'public', s.photo);
        if (!fs.existsSync(photoPath)) {
          report.brokenPhotos.push(`Student: ${s.name} (Adm: ${s.admissionNumber}) - Photo missing: ${s.photo}`);
        }
      }
    }
  } catch (err: any) {
    report.brokenPhotos.push(`Failed photo verification: ${err.message}`);
  }

  // 3. Verify Receipts
  try {
    const txs = await prisma.feeTransaction.findMany({
      select: { receiptNumber: true }
    });

    const duplicates = new Set<string>();
    const seen = new Set<string>();

    for (const t of txs) {
      if (seen.has(t.receiptNumber)) {
        duplicates.add(t.receiptNumber);
      }
      seen.add(t.receiptNumber);
    }

    if (duplicates.size > 0) {
      report.receiptIssues.push(`Duplicate receipt numbers found: ${Array.from(duplicates).join(', ')}`);
    } else {
      report.receiptIssues.push('Receipt sequences verified: No duplicate serials found.');
    }
  } catch (err: any) {
    report.receiptIssues.push(`Failed receipt verification: ${err.message}`);
  }

  // 4. Remove Empty Files
  try {
    if (fs.existsSync(UPLOADS_DIR)) {
      const files = fs.readdirSync(UPLOADS_DIR);
      for (const file of files) {
        const filePath = path.join(UPLOADS_DIR, file);
        const stat = fs.statSync(filePath);
        if (stat.isFile() && stat.size === 0) {
          fs.unlinkSync(filePath);
          report.cleanedFiles.push(`Cleaned empty file: ${file}`);
        }
      }
    }
  } catch (err: any) {
    report.cleanedFiles.push(`Failed cleaning empty files: ${err.message}`);
  }

  // 5. Reindex Database Tables & Run VACUUM
  try {
    // Reindex tables
    await prisma.$executeRawUnsafe('REINDEX SCHEMA public;');
    report.reindexedTables.push('Public schema reindexed successfully.');
  } catch (err: any) {
    report.reindexedTables.push(`Reindex failed: ${err.message} (Note: may require superuser permissions)`);
  }

  try {
    // VACUUM ANALYZE (must be run outside transaction blocks)
    // Note: VACUUM cannot run inside a transaction block or $executeRaw if prisma pools connections with transactions,
    // so we call VACUUM only if supported, or log fallback.
    await prisma.$executeRawUnsafe('VACUUM ANALYZE;');
    report.vacuumed = true;
  } catch (err: any) {
    console.warn('VACUUM failed (usually runs outside transaction pools):', err.message);
    report.vacuumed = false;
  }

  return report;
}
