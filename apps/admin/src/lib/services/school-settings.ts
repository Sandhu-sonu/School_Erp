import { prisma } from '@school-erp/db';

export async function getSchoolSettings() {
  let settings = await prisma.schoolSettings.findFirst();
  if (!settings) {
    settings = await prisma.schoolSettings.create({
      data: {
        schoolName: 'Demo Indian Academy',
        address: '123, School Lane, New Delhi, India',
        board: 'CBSE',
        principalName: 'Dr. R. K. Sharma',
        phone: '+91 98765 43210',
        email: 'info@demoindianacademy.edu.in',
        website: 'https://demoindianacademy.edu.in',
        logoUrl: '/logo.png',
        sessionPrefix: 'SCH',
        admissionPrefix: 'SCH',
        employeePrefix: 'EMP',
        receiptPrefix: 'SCH',
        currency: 'INR ₹',
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
        language: 'English',
        workingDays: 220,
        passingPercent: 40.0
      }
    });
  }
  return settings;
}

export async function updateSchoolSettings(id: string, data: any) {
  return await prisma.schoolSettings.update({
    where: { id },
    data: {
      schoolName: data.schoolName,
      address: data.address,
      board: data.board,
      principalName: data.principalName,
      phone: data.phone,
      email: data.email,
      website: data.website || null,
      logoUrl: data.logoUrl || null,
      sessionPrefix: data.sessionPrefix,
      admissionPrefix: data.admissionPrefix,
      employeePrefix: data.employeePrefix,
      receiptPrefix: data.receiptPrefix,
      currency: data.currency,
      timezone: data.timezone,
      dateFormat: data.dateFormat,
      language: data.language,
      workingDays: data.workingDays ? Number(data.workingDays) : undefined,
      passingPercent: data.passingPercent ? Number(data.passingPercent) : undefined
    }
  });
}
