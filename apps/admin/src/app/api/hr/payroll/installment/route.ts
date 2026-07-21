import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { processSalaryPayment } from '@/lib/services/payroll';
import { SalaryPaymentType, PaymentMode, FinalSettlementReason } from '@prisma/client';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'PRINCIPAL' && role !== 'ACCOUNTANT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { 
      staffId, 
      payrollCycleId, 
      paymentType, 
      installmentAmount, 
      paymentMode, 
      transactionReference, 
      remarks,
      recoverAdvanceId, 
      recoverAdvanceAmount, 
      recoverLoanId, 
      recoverLoanAmount,
      adjustments,
      finalSettlementReason
    } = body;

    if (!staffId || !payrollCycleId || !paymentType || installmentAmount === undefined || !paymentMode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const payment = await processSalaryPayment({
      staffId,
      payrollCycleId,
      paymentType: paymentType as SalaryPaymentType,
      installmentAmount: Number(installmentAmount),
      paymentMode: paymentMode as PaymentMode,
      transactionReference,
      remarks,
      recoverAdvanceId,
      recoverAdvanceAmount: recoverAdvanceAmount ? Number(recoverAdvanceAmount) : undefined,
      recoverLoanId,
      recoverLoanAmount: recoverLoanAmount ? Number(recoverLoanAmount) : undefined,
      adjustments: adjustments || [],
      finalSettlementReason: finalSettlementReason as FinalSettlementReason,
      createdById: session.user.id,
    });

    // Format Decimal values to float/string safely to avoid client serialization issues
    const formattedPayment = JSON.parse(JSON.stringify(payment));

    return NextResponse.json(formattedPayment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
