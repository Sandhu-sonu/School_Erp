import { prisma } from '@school-erp/db';
import fs from 'fs/promises';
import path from 'path';

function getUploadDir() {
  const rootPublic = path.join(process.cwd(), 'public', 'uploads', 'gallery');
  if (process.cwd().includes('apps') || !process.cwd().endsWith('School-erp')) {
    const rootPath = process.cwd().split('apps')[0];
    return path.join(rootPath, 'public', 'uploads', 'gallery');
  }
  return rootPublic;
}

const UPLOAD_DIR = getUploadDir();

export async function uploadGalleryPhoto(title: string, category: string | null, fileBuffer: Buffer, mimeType: string) {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
    throw new Error('Invalid image type. Allowed types: jpg, jpeg, png, webp');
  }

  if (fileBuffer.length > 2 * 1024 * 1024) {
    throw new Error('Image size exceeds 2MB limit.');
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  // Generate ID
  const itemId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
  const filename = `gallery-${itemId}.webp`;
  const targetFilePath = path.join(UPLOAD_DIR, filename);

  const sharp = (await import('sharp')).default;
  const processedBuffer = await sharp(fileBuffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  await fs.writeFile(targetFilePath, processedBuffer);

  const imageUrl = `/uploads/gallery/${filename}`;

  const item = await prisma.galleryItem.create({
    data: {
      id: itemId,
      title,
      imageUrl,
      category: category || null,
    },
  });

  return item;
}

export async function deleteGalleryPhoto(id: string) {
  const item = await prisma.galleryItem.findUniqueOrThrow({
    where: { id },
  });

  if (item.imageUrl) {
    const filename = path.basename(item.imageUrl);
    const filePath = path.join(UPLOAD_DIR, filename);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      // Ignore if file doesn't exist
    }
  }

  await prisma.galleryItem.delete({
    where: { id },
  });
}
