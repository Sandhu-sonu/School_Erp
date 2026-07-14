import React from 'react';
import { isModuleEnabled } from '@/lib/services/modules';
import ModuleDisabled from '@/components/ModuleDisabled';

export default async function ResultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isModuleEnabled('RESULTS'))) {
    return <ModuleDisabled moduleName="Results" />;
  }
  return <>{children}</>;
}
