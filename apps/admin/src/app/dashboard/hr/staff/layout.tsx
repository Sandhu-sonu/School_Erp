import React from 'react';
import { isModuleEnabled } from '@/lib/services/modules';
import ModuleDisabled from '@/components/ModuleDisabled';

export default async function HRStaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isModuleEnabled('HR'))) {
    return <ModuleDisabled moduleName="Staff Directory (HR)" />;
  }
  return <>{children}</>;
}
