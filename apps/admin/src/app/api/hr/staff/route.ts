import { NextRequest, NextResponse } from 'next/server';
import { createStaff, getStaffList } from '@/lib/services/hr';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@school-erp/utils';

import { isModuleEnabled } from '@/lib/services/modules';

export async function GET(request: NextRequest) {
  if (!(await isModuleEnabled('HR'))) {
    return NextResponse.json({ error: 'HR module is disabled.' }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  // Principal, Accountant, and Clerk are allowed to read staff list
  if (role !== 'PRINCIPAL' && role !== 'ACCOUNTANT' && role !== 'CLERK') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || undefined;
  const status = (searchParams.get('status') as any) || undefined;
  const page = Number(searchParams.get('page') || 1);
  const limit = Number(searchParams.get('limit') || 20);

  try {
    const result = await getStaffList({ search, status, page, limit });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  // Clerk is blocked from staff creation
  if (role !== 'PRINCIPAL' && role !== 'ACCOUNTANT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, mobile, email, gender, dob, joiningDate, designation, qualification, monthlySalary, remarks } = body;

    if (!name || !mobile || !gender || !dob || !joiningDate || !designation || !qualification || monthlySalary === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const staff = await createStaff({
      name,
      mobile,
      email,
      gender,
      dob: new Date(dob),
      joiningDate: new Date(joiningDate),
      designation,
      qualification,
      monthlySalary: Number(monthlySalary),
      remarks,
    });

    return NextResponse.json(staff, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
