import React from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@school-erp/db';
import { isModuleEnabled } from '@/lib/services/modules';
import ModuleDisabled from '@/components/ModuleDisabled';
import ParentNavWrapper from './ParentNavWrapper';

export default async function ParentPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Check feature toggle first
  const active = await isModuleEnabled('PARENT_PORTAL');
  if (!active) {
    return <ModuleDisabled moduleName="Parent Portal" />;
  }

  const cookieStore = await cookies();
  const parentId = cookieStore.get('parent_session')?.value;

  const headerList = await headers();
  const pathname = headerList.get('x-pathname') || '';

  // Bypass auth checks for login page
  const isLoginPage = pathname.endsWith('/portal/login');

  if (!parentId && !isLoginPage) {
    redirect('/portal/login');
  }

  if (parentId && isLoginPage) {
    redirect('/portal/dashboard');
  }

  let parent = null;
  if (parentId) {
    parent = await prisma.parent.findUnique({
      where: { id: parentId },
      include: {
        students: {
          where: { status: 'ACTIVE' },
          include: {
            enrollments: {
              where: { isArchived: false },
              include: {
                class: true,
                section: true
              }
            }
          }
        }
      }
    });
  }

  // If parent logged in but profile not found, clear session and login again
  if (parentId && !parent) {
    redirect('/portal/login');
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <ParentNavWrapper parent={parent}>
      {children}
    </ParentNavWrapper>
  );
}
