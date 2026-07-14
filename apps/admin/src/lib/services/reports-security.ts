export function isAllowedReport(role: string, reportType: string): boolean {
  const upperRole = role.toUpperCase();
  const upperType = reportType.toUpperCase();

  if (upperRole === 'PRINCIPAL' || upperRole === 'HEAD') {
    return true;
  }
  if (upperRole === 'CLERK') {
    return true; // Clerk has read-only to all reports
  }
  if (upperRole === 'TEACHER') {
    // Attendance + Results only
    return upperType === 'ATTENDANCE' || upperType === 'RESULTS';
  }
  if (upperRole === 'ACCOUNTANT') {
    // Finance + HR only
    return upperType === 'FINANCE' || upperType === 'HR';
  }
  return false;
}
