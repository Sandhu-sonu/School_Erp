import React from 'react';
import { isModuleEnabled } from '@/lib/services/modules';
import ModuleDisabled from '@/components/ModuleDisabled';

export default async function CommunicationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isModuleEnabled('COMMUNICATIONS'))) {
    return <ModuleDisabled moduleName="Notice Board" />;
  }
  return <>{children}</>;
}
