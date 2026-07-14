import React from 'react';
import { isModuleEnabled } from '@/lib/services/modules';
import ModuleDisabled from '@/components/ModuleDisabled';

export default async function HRSalaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isModuleEnabled('SALARY'))) {
    return <ModuleDisabled moduleName="Salary Desk" />;
  }
  return <>{children}</>;
}
