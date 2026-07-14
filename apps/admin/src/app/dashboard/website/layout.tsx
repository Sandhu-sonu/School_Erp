import React from 'react';
import { isModuleEnabled } from '@/lib/services/modules';
import ModuleDisabled from '@/components/ModuleDisabled';

export default async function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isModuleEnabled('WEBSITE'))) {
    return <ModuleDisabled moduleName="Public Website" />;
  }
  return <>{children}</>;
}
