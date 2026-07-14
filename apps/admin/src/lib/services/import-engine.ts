import { prisma } from '@school-erp/db';
import * as xlsx from 'xlsx';

export interface ImportError {
  row: number;
  message: string;
}

export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  duplicates: number;
  skipped: number;
  errors: ImportError[];
  preview: any[];
}

export function parseBuffer(buffer: Buffer, fileName: string): any[] {
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

  if (isExcel) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(sheet);
  } else {
    // Parse CSV
    const csvContent = buffer.toString('utf8');
    const lines = csvContent.split(/\r?\n/);
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const obj: Record<string, any> = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx] || '';
      });
      data.push(obj);
    }
    return data;
  }
}

export async function processImport(
  buffer: Buffer,
  fileName: string,
  module: string,
  dryRun = false,
  importedBy?: string
): Promise<ImportResult> {
  const parsedData = parseBuffer(buffer, fileName);
  const result: ImportResult = {
    total: parsedData.length,
    success: 0,
    failed: 0,
    duplicates: 0,
    skipped: 0,
    errors: [],
    preview: parsedData.slice(0, 5) // Return first 5 rows as preview
  };

  if (parsedData.length === 0) {
    result.errors.push({ row: 0, message: 'No records found in import file.' });
    return result;
  }

  // We run imports in a transactional block to support rollback on validation failure (if not dry-run)
  try {
    await prisma.$transaction(async (tx) => {
      let rowIndex = 1;
      for (const row of parsedData) {
        rowIndex++;
        try {
          if (module === 'CLASSES') {
            const { name, sequence } = row;
            if (!name) throw new Error('Class Name is required.');
            const seq = Number(sequence || 0);

            // Duplicate check
            const duplicate = await tx.class.findUnique({ where: { name } });
            if (duplicate) {
              result.duplicates++;
              result.skipped++;
              continue;
            }

            if (!dryRun) {
              await tx.class.create({ data: { name, sequence: seq } });
            }
            result.success++;
          } 
          
          else if (module === 'PARENTS') {
            const { fatherName, motherName, mobile, address } = row;
            if (!fatherName || !mobile) throw new Error('Father Name and Mobile are required.');

            // Duplicate check
            const duplicate = await tx.parent.findUnique({ where: { mobile: String(mobile) } });
            if (duplicate) {
              result.duplicates++;
              result.skipped++;
              continue;
            }

            if (!dryRun) {
              await tx.parent.create({
                data: {
                  fatherName,
                  motherName: motherName || null,
                  mobile: String(mobile),
                  address: address || null
                }
              });
            }
            result.success++;
          } 
          
          else if (module === 'STAFF') {
            const { name, phone, email, basicSalary, employeeCode, designation } = row;
            if (!name || !phone) throw new Error('Name and Phone (Mobile) are required.');

            const mobile = String(phone);

            // Duplicate check
            const duplicate = await tx.staff.findFirst({ where: { mobile } });
            if (duplicate) {
              result.duplicates++;
              result.skipped++;
              continue;
            }

            if (!dryRun) {
              const settings = await tx.schoolSettings.findFirst();
              const prefix = settings?.employeePrefix || 'EMP';
              const count = await tx.staff.count();
              const generatedCode = employeeCode || `${prefix}-${new Date().getFullYear()}-${1000 + count}`;

              await tx.staff.create({
                data: {
                  employeeCode: generatedCode,
                  name,
                  mobile,
                  email: email || null,
                  gender: 'MALE',
                  dob: new Date('1990-01-01'),
                  joiningDate: new Date(),
                  designation: designation || 'Teacher',
                  qualification: 'Graduate',
                  monthlySalary: Number(basicSalary || 0),
                  status: 'ACTIVE'
                }
              });
            }
            result.success++;
          }

          else {
            throw new Error(`Unsupported import module: ${module}`);
          }
        } catch (rowErr: any) {
          result.failed++;
          result.errors.push({ row: rowIndex, message: rowErr.message });
          // If not dryRun and we encounter failure, abort and let transaction rollback
          if (!dryRun) {
            throw new Error(`Rollback triggered by row error: ${rowErr.message}`);
          }
        }
      }
    });
  } catch (txErr: any) {
    if (!dryRun) {
      // Log rollback
      await prisma.importHistory.create({
        data: {
          module,
          fileName,
          totalRecords: result.total,
          successRecords: 0,
          failedRecords: result.total,
          duplicateRecords: result.duplicates,
          skippedRecords: result.skipped,
          rollback: true,
          validationErrors: result.errors as any,
          importedBy: importedBy || 'SYSTEM'
        }
      });
      return result;
    }
  }

  // Create ImportHistory record if dryRun is false
  if (!dryRun) {
    await prisma.importHistory.create({
      data: {
        module,
        fileName,
        totalRecords: result.total,
        successRecords: result.success,
        failedRecords: result.failed,
        duplicateRecords: result.duplicates,
        skippedRecords: result.skipped,
        rollback: false,
        validationErrors: result.errors.length ? (result.errors as any) : null,
        importedBy: importedBy || 'SYSTEM'
      }
    });
  }

  return result;
}
