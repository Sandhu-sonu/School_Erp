import { prisma } from '@school-erp/db';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

export interface BackupMetadata {
  dbVersion: string;
  backupVersion: string;
  timestamp: string;
  tables: Record<string, any[]>;
  files: Record<string, string>; // filename -> base64 content
}

function ensureDirectories() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

export async function createBackup(type: 'MANUAL' | 'AUTO', createdBy?: string): Promise<string> {
  ensureDirectories();
  const startTime = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `backup_${timestamp}.json`;
  const filePath = path.join(BACKUP_DIR, backupName);

  // 1. Fetch all database tables using their exact Prisma client key names
  const tables: Record<string, any[]> = {
    schoolSettings: await prisma.schoolSettings.findMany(),
    moduleSetting: await prisma.moduleSetting.findMany(),
    moduleDependency: await prisma.moduleDependency.findMany(),
    systemSetting: await prisma.systemSetting.findMany(),
    user: await prisma.user.findMany(),
    parent: await prisma.parent.findMany(),
    student: await prisma.student.findMany(),
    academicSession: await prisma.academicSession.findMany(),
    class: await prisma.class.findMany(),
    section: await prisma.section.findMany(),
    classTeacher: await prisma.classTeacher.findMany(),
    classEnrollment: await prisma.classEnrollment.findMany(),
    subject: await prisma.subject.findMany(),
    timetable: await prisma.timetable.findMany(),
    attendance: await prisma.attendance.findMany(),
    attendanceSummary: await prisma.attendanceSummary.findMany(),
    notice: await prisma.notice.findMany(),
    galleryItem: await prisma.galleryItem.findMany(),
    feePlan: await prisma.feePlan.findMany(),
    studentFeeAccount: await prisma.studentFeeAccount.findMany(),
    feeTransaction: await prisma.feeTransaction.findMany(),
    feeAdjustment: await prisma.feeAdjustment.findMany(),
    route: await prisma.route.findMany(),
    stop: await prisma.stop.findMany(),
    studentTransport: await prisma.studentTransport.findMany(),
    exam: await prisma.exam.findMany(),
    examMark: await prisma.examMark.findMany(),
    result: await prisma.result.findMany(),
    staff: await prisma.staff.findMany(),
    salaryPayment: await prisma.salaryPayment.findMany(),
    salaryAdjustment: await prisma.salaryAdjustment.findMany(),
    uatTestCase: await prisma.uatTestCase.findMany(),
    auditLog: await prisma.auditLog.findMany(),
    errorLog: await prisma.errorLog.findMany(),
    importHistory: await prisma.importHistory.findMany(),
    exportHistory: await prisma.exportHistory.findMany(),
    lead: await prisma.lead.findMany(),
    expense: await prisma.expense.findMany(),
    promotionHistory: await prisma.promotionHistory.findMany(),
    admissionSequence: await prisma.admissionSequence.findMany(),
    receiptSequence: await prisma.receiptSequence.findMany(),
    employeeSequence: await prisma.employeeSequence.findMany(),
    salaryReceiptSequence: await prisma.salaryReceiptSequence.findMany(),
    reportAudit: await prisma.reportAudit.findMany()
  };

  // 2. Read all files in uploads
  const files: Record<string, string> = {};
  if (fs.existsSync(UPLOADS_DIR)) {
    const list = fs.readdirSync(UPLOADS_DIR);
    for (const file of list) {
      const fullPath = path.join(UPLOADS_DIR, file);
      if (fs.statSync(fullPath).isFile()) {
        const content = fs.readFileSync(fullPath);
        files[file] = content.toString('base64');
      }
    }
  }

  const metadata: BackupMetadata = {
    dbVersion: 'PostgreSQL 15',
    backupVersion: 'v1.0.0',
    timestamp: new Date().toISOString(),
    tables,
    files
  };

  const jsonContent = JSON.stringify(metadata, null, 2);
  fs.writeFileSync(filePath, jsonContent, 'utf8');

  const fileSize = BigInt(fs.statSync(filePath).size);
  const checksum = createHash('md5').update(jsonContent).digest('hex');
  const duration = Date.now() - startTime;

  // Save to BackupHistory
  await prisma.backupHistory.create({
    data: {
      backupName,
      backupType: type,
      fileSize,
      filePath,
      duration,
      backupVersion: 'v1.0.0',
      databaseVersion: 'PostgreSQL 15',
      checksum,
      status: 'COMPLETED',
      createdBy: createdBy || 'SYSTEM'
    }
  });

  // Apply retention policy
  const settings = await prisma.schoolSettings.findFirst();
  const retentionDays = settings?.backupRetentionDays || 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const oldBackups = await prisma.backupHistory.findMany({
    where: { createdAt: { lt: cutoffDate } }
  });

  for (const b of oldBackups) {
    try {
      if (fs.existsSync(b.filePath)) {
        fs.unlinkSync(b.filePath);
      }
      await prisma.backupHistory.delete({ where: { id: b.id } });
    } catch (err) {
      console.error(`Failed to clean up old backup ${b.backupName}:`, err);
    }
  }

  return backupName;
}

export async function restoreBackup(backupId: string): Promise<boolean> {
  const backup = await prisma.backupHistory.findUnique({
    where: { id: backupId }
  });

  if (!backup || !fs.existsSync(backup.filePath)) {
    throw new Error('Backup file not found on disk.');
  }

  const jsonContent = fs.readFileSync(backup.filePath, 'utf8');
  const metadata: BackupMetadata = JSON.parse(jsonContent);

  // Run restore inside transactional blocks
  await prisma.$transaction(async (tx) => {
    // 1. Delete all tables in safe dependency order to prevent FK violations
    await tx.admissionSequence.deleteMany();
    await tx.receiptSequence.deleteMany();
    await tx.employeeSequence.deleteMany();
    await tx.salaryReceiptSequence.deleteMany();

    await tx.reportAudit.deleteMany();
    await tx.uatTestCase.deleteMany();
    await tx.auditLog.deleteMany();
    await tx.errorLog.deleteMany();
    await tx.exportHistory.deleteMany();
    await tx.importHistory.deleteMany();
    await tx.result.deleteMany();
    await tx.examMark.deleteMany();
    await tx.exam.deleteMany();
    await tx.studentTransport.deleteMany();
    await tx.stop.deleteMany();
    await tx.route.deleteMany();
    await tx.feeTransaction.deleteMany();
    await tx.feeAdjustment.deleteMany();
    await tx.studentFeeAccount.deleteMany();
    await tx.feePlan.deleteMany();
    await tx.timetable.deleteMany();
    await tx.subject.deleteMany();
    await tx.classEnrollment.deleteMany();
    await tx.classTeacher.deleteMany();
    await tx.section.deleteMany();
    await tx.class.deleteMany();
    await tx.attendanceSummary.deleteMany();
    await tx.attendance.deleteMany();
    await tx.notice.deleteMany();
    await tx.galleryItem.deleteMany();
    await tx.salaryAdjustment.deleteMany();
    await tx.salaryPayment.deleteMany();
    await tx.staff.deleteMany();
    await tx.student.deleteMany();
    await tx.parent.deleteMany();
    await tx.user.deleteMany();
    await tx.moduleDependency.deleteMany();
    await tx.moduleSetting.deleteMany();
    await tx.systemSetting.deleteMany();
    await tx.schoolSettings.deleteMany();
    await tx.lead.deleteMany();
    await tx.expense.deleteMany();
    await tx.promotionHistory.deleteMany();
    await tx.academicSession.deleteMany();

    // 2. Restore tables in reverse dependency order
    if (metadata.tables.schoolSettings?.length) {
      await tx.schoolSettings.createMany({ data: metadata.tables.schoolSettings });
    }
    if (metadata.tables.systemSetting?.length) {
      await tx.systemSetting.createMany({ data: metadata.tables.systemSetting });
    }
    if (metadata.tables.moduleSetting?.length) {
      await tx.moduleSetting.createMany({ data: metadata.tables.moduleSetting });
    }
    if (metadata.tables.moduleDependency?.length) {
      await tx.moduleDependency.createMany({ data: metadata.tables.moduleDependency });
    }
    if (metadata.tables.user?.length) {
      await tx.user.createMany({ data: metadata.tables.user });
    }
    if (metadata.tables.parent?.length) {
      await tx.parent.createMany({ data: metadata.tables.parent });
    }
    if (metadata.tables.student?.length) {
      await tx.student.createMany({ data: metadata.tables.student });
    }
    if (metadata.tables.staff?.length) {
      await tx.staff.createMany({ data: metadata.tables.staff });
    }
    if (metadata.tables.salaryPayment?.length) {
      await tx.salaryPayment.createMany({ data: metadata.tables.salaryPayment });
    }
    if (metadata.tables.salaryAdjustment?.length) {
      await tx.salaryAdjustment.createMany({ data: metadata.tables.salaryAdjustment });
    }
    if (metadata.tables.academicSession?.length) {
      await tx.academicSession.createMany({ data: metadata.tables.academicSession });
    }
    if (metadata.tables.class?.length) {
      await tx.class.createMany({ data: metadata.tables.class });
    }
    if (metadata.tables.section?.length) {
      await tx.section.createMany({ data: metadata.tables.section });
    }
    if (metadata.tables.classTeacher?.length) {
      await tx.classTeacher.createMany({ data: metadata.tables.classTeacher });
    }
    if (metadata.tables.classEnrollment?.length) {
      await tx.classEnrollment.createMany({ data: metadata.tables.classEnrollment });
    }
    if (metadata.tables.subject?.length) {
      await tx.subject.createMany({ data: metadata.tables.subject });
    }
    if (metadata.tables.timetable?.length) {
      await tx.timetable.createMany({ data: metadata.tables.timetable });
    }
    if (metadata.tables.attendance?.length) {
      await tx.attendance.createMany({ data: metadata.tables.attendance });
    }
    if (metadata.tables.attendanceSummary?.length) {
      await tx.attendanceSummary.createMany({ data: metadata.tables.attendanceSummary });
    }
    if (metadata.tables.notice?.length) {
      await tx.notice.createMany({ data: metadata.tables.notice });
    }
    if (metadata.tables.galleryItem?.length) {
      await tx.galleryItem.createMany({ data: metadata.tables.galleryItem });
    }
    if (metadata.tables.feePlan?.length) {
      await tx.feePlan.createMany({ data: metadata.tables.feePlan });
    }
    if (metadata.tables.studentFeeAccount?.length) {
      await tx.studentFeeAccount.createMany({ data: metadata.tables.studentFeeAccount });
    }
    if (metadata.tables.feeTransaction?.length) {
      await tx.feeTransaction.createMany({ data: metadata.tables.feeTransaction });
    }
    if (metadata.tables.feeAdjustment?.length) {
      await tx.feeAdjustment.createMany({ data: metadata.tables.feeAdjustment });
    }
    if (metadata.tables.route?.length) {
      await tx.route.createMany({ data: metadata.tables.route });
    }
    if (metadata.tables.stop?.length) {
      await tx.stop.createMany({ data: metadata.tables.stop });
    }
    if (metadata.tables.studentTransport?.length) {
      await tx.studentTransport.createMany({ data: metadata.tables.studentTransport });
    }
    if (metadata.tables.exam?.length) {
      await tx.exam.createMany({ data: metadata.tables.exam });
    }
    if (metadata.tables.examMark?.length) {
      await tx.examMark.createMany({ data: metadata.tables.examMark });
    }
    if (metadata.tables.result?.length) {
      await tx.result.createMany({ data: metadata.tables.result });
    }
    if (metadata.tables.uatTestCase?.length) {
      await tx.uatTestCase.createMany({ data: metadata.tables.uatTestCase });
    }
    if (metadata.tables.auditLog?.length) {
      await tx.auditLog.createMany({ data: metadata.tables.auditLog });
    }
    if (metadata.tables.errorLog?.length) {
      await tx.errorLog.createMany({ data: metadata.tables.errorLog });
    }
    if (metadata.tables.importHistory?.length) {
      await tx.importHistory.createMany({ data: metadata.tables.importHistory });
    }
    if (metadata.tables.exportHistory?.length) {
      await tx.exportHistory.createMany({ data: metadata.tables.exportHistory });
    }
    if (metadata.tables.lead?.length) {
      await tx.lead.createMany({ data: metadata.tables.lead });
    }
    if (metadata.tables.expense?.length) {
      await tx.expense.createMany({ data: metadata.tables.expense });
    }
    if (metadata.tables.promotionHistory?.length) {
      await tx.promotionHistory.createMany({ data: metadata.tables.promotionHistory });
    }
    if (metadata.tables.admissionSequence?.length) {
      await tx.admissionSequence.createMany({ data: metadata.tables.admissionSequence });
    }
    if (metadata.tables.receiptSequence?.length) {
      await tx.receiptSequence.createMany({ data: metadata.tables.receiptSequence });
    }
    if (metadata.tables.employeeSequence?.length) {
      await tx.employeeSequence.createMany({ data: metadata.tables.employeeSequence });
    }
    if (metadata.tables.salaryReceiptSequence?.length) {
      await tx.salaryReceiptSequence.createMany({ data: metadata.tables.salaryReceiptSequence });
    }
    if (metadata.tables.reportAudit?.length) {
      await tx.reportAudit.createMany({ data: metadata.tables.reportAudit });
    }
  });

  // Restore uploaded files to disk
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  for (const [filename, base64Content] of Object.entries(metadata.files)) {
    const fullPath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(fullPath, Buffer.from(base64Content, 'base64'));
  }

  return true;
}
