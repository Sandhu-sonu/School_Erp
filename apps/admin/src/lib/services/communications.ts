import { prisma } from '@school-erp/db';
import { NoticeStatus } from '@prisma/client';

export async function createNotice(
  title: string,
  description: string,
  targetRole?: string | null,
  targetClass?: string | null,
  expiryDate?: Date | null
) {
  return await prisma.notice.create({
    data: {
      title,
      description,
      targetRole: targetRole || null,
      targetClass: targetClass || null,
      expiryDate: expiryDate || null,
      status: NoticeStatus.DRAFT,
      publishDate: null,
    },
  });
}

export async function publishNotice(id: string) {
  return await prisma.notice.update({
    where: { id },
    data: {
      status: NoticeStatus.PUBLISHED,
      publishDate: new Date(),
    },
  });
}

export async function archiveNotice(id: string) {
  return await prisma.notice.update({
    where: { id },
    data: {
      status: NoticeStatus.ARCHIVED,
    },
  });
}

export async function expireNotices() {
  const now = new Date();
  // Find all PUBLISHED notices where expiryDate is set and is in the past
  const expiredNotices = await prisma.notice.findMany({
    where: {
      status: NoticeStatus.PUBLISHED,
      expiryDate: {
        lt: now,
      },
    },
  });

  for (const notice of expiredNotices) {
    await prisma.notice.update({
      where: { id: notice.id },
      data: {
        status: NoticeStatus.EXPIRED,
      },
    });
  }

  return expiredNotices.length;
}

export async function getActiveNotices(role?: string, classId?: string) {
  // First, auto-expire any that have passed their expiry
  await expireNotices();

  const now = new Date();

  return await prisma.notice.findMany({
    where: {
      status: NoticeStatus.PUBLISHED,
      OR: [
        { expiryDate: null },
        { expiryDate: { gte: now } },
      ],
      // If role filter is provided
      ...(role ? {
        OR: [
          { targetRole: null },
          { targetRole: role },
        ],
      } : {}),
      // If classId filter is provided
      ...(classId ? {
        OR: [
          { targetClass: null },
          { targetClass: classId },
        ],
      } : {}),
    },
    orderBy: {
      publishDate: 'desc',
    },
  });
}
