import { prisma } from '@school-erp/db';
import { NextRequest } from 'next/server';

export interface AuditDiffNode {
  field: string;
  oldValue: any;
  newValue: any;
}

export function computeJsonDiff(before: any, after: any): AuditDiffNode[] {
  const diffs: AuditDiffNode[] = [];
  if (!before && !after) return diffs;

  const beforeObj = before || {};
  const afterObj = after || {};

  const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);

  for (const key of allKeys) {
    const valBefore = beforeObj[key];
    const valAfter = afterObj[key];

    // Stringify objects or arrays for comparison
    const strBefore = typeof valBefore === 'object' ? JSON.stringify(valBefore) : valBefore;
    const strAfter = typeof valAfter === 'object' ? JSON.stringify(valAfter) : valAfter;

    if (strBefore !== strAfter) {
      diffs.push({
        field: key,
        oldValue: valBefore,
        newValue: valAfter
      });
    }
  }

  return diffs;
}

export async function writeAuditLog({
  userId,
  role,
  action,
  entity,
  beforeJson,
  afterJson,
  request
}: {
  userId?: string;
  role?: string;
  action: string;
  entity?: string;
  beforeJson?: any;
  afterJson?: any;
  request?: NextRequest;
}) {
  try {
    let ipAddress = '127.0.0.1';
    let browser = 'Unknown Browser';
    let requestId = undefined;

    if (request) {
      ipAddress = request.headers.get('x-forwarded-for') || '127.0.0.1';
      browser = request.headers.get('user-agent') || 'Unknown Browser';
      requestId = request.headers.get('x-request-id') || undefined;
    }

    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        role: role || null,
        action,
        entity: entity || null,
        beforeJson: beforeJson ? (beforeJson as any) : null,
        afterJson: afterJson ? (afterJson as any) : null,
        ipAddress,
        browser,
        requestId
      }
    });
  } catch (err) {
    console.error('Failed to create AuditLog entry:', err);
  }
}
