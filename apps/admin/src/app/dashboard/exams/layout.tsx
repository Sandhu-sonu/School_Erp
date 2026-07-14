import React from 'react';
import { isModuleEnabled } from '@/lib/services/modules';
import ModuleDisabled from '@/components/ModuleDisabled';

export default async function ExamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isModuleEnabled('EXAMS'))) {
    return <ModuleDisabled moduleName="Examinations" />;
  }
  return <>{children}</>;
}
