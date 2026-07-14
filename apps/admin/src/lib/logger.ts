import { prisma } from '@school-erp/db';

export type LogLevel = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface LogPayload {
  level: LogLevel;
  module: string;
  message: string;
  route?: string;
  stackTrace?: string;
  requestId?: string;
  userId?: string;
}

export async function logMessage(payload: LogPayload) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${payload.level}] [${payload.module}]: ${payload.message}`);

  if (payload.level === 'ERROR' || payload.level === 'CRITICAL') {
    try {
      // Async database logger
      await prisma.errorLog.create({
        data: {
          level: payload.level,
          module: payload.module,
          route: payload.route || null,
          message: payload.message,
          stackTrace: payload.stackTrace || null,
          requestId: payload.requestId || null,
          userId: payload.userId || null
        }
      });
    } catch (dbErr) {
      console.error('Failed to write error log to database:', dbErr);
    }
  }
}

export async function logInfo(module: string, message: string, userId?: string, requestId?: string) {
  await logMessage({ level: 'INFO', module, message, userId, requestId });
}

export async function logWarning(module: string, message: string, userId?: string, requestId?: string) {
  await logMessage({ level: 'WARNING', module, message, userId, requestId });
}

export async function logError(module: string, message: string, stackTrace?: string, userId?: string, requestId?: string, route?: string) {
  await logMessage({ level: 'ERROR', module, message, stackTrace, userId, requestId, route });
}

export async function logCritical(module: string, message: string, stackTrace?: string, userId?: string, requestId?: string, route?: string) {
  await logMessage({ level: 'CRITICAL', module, message, stackTrace, userId, requestId, route });
}

export async function captureException(module: string, err: any, userId?: string, requestId?: string, route?: string) {
  const message = err instanceof Error ? err.message : String(err);
  const stackTrace = err instanceof Error ? err.stack : undefined;
  await logError(module, message, stackTrace, userId, requestId, route);
}

export async function captureApiError(route: string, err: any, userId?: string, requestId?: string) {
  await captureException('API_ROUTE', err, userId, requestId, route);
}
