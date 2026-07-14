import React from 'react';
import { isModuleEnabled } from '@/lib/services/modules';
import ModuleDisabled from '@/components/ModuleDisabled';

export default async function TransportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isModuleEnabled('TRANSPORT'))) {
    return <ModuleDisabled moduleName="Transport" />;
  }
  return <>{children}</>;
}
