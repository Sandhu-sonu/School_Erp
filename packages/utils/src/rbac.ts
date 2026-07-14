export type UserRole = 'PRINCIPAL' | 'HEAD' | 'CLERK' | 'ACCOUNTANT' | 'TEACHER';

export const RolePermissions = {
  PRINCIPAL: {
    academics: 'write',
    admissions: 'write',
    finance: 'write',
    operations: 'write',
    reports: 'write',
    website: 'write',
    system: 'write',
  },
  HEAD: {
    academics: 'write',
    admissions: 'write',
    finance: 'none',
    operations: 'write',
    reports: 'write',
    website: 'write',
    system: 'none',
  },
  CLERK: {
    academics: 'read',
    admissions: 'write',
    finance: 'collect', // Can collect fees but cannot modify fee plans or view financial ledger
    operations: 'none',
    reports: 'read',    // Can see student list, cannot see fee reports
    website: 'none',
    system: 'none',
  },
  ACCOUNTANT: {
    academics: 'none',
    admissions: 'none',
    finance: 'write',
    operations: 'none',
    reports: 'write',
    website: 'none',
    system: 'none',
  },
  TEACHER: {
    academics: 'read',
    admissions: 'none',
    operations: 'write', // Can mark class attendance and view timetables
    finance: 'none',
    reports: 'none',
    website: 'none',
    system: 'none',
  },
} as const;

export function hasPermission(
  role: UserRole,
  module: keyof (typeof RolePermissions)['PRINCIPAL'],
  level: 'read' | 'write' | 'collect'
): boolean {
  const perm = RolePermissions[role]?.[module] as string | undefined;
  if (!perm || perm === 'none') return false;
  if (level === 'read') return true; // Any level (read/write/collect) can read
  if (level === 'collect') return perm === 'write' || perm === 'collect';
  if (level === 'write') return perm === 'write';
  return false;
}
