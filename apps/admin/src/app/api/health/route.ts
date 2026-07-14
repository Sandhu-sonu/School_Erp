import { NextResponse } from 'next/server';
import { prisma } from '@school-erp/db';

export async function GET() {
  try {
    // Execute dynamic verification query
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'UP',
      database: 'CONNECTED',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'DOWN',
        database: 'DISCONNECTED',
        error: error.message || String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
