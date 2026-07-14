import { prisma } from '@school-erp/db';
import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'students');

export async function uploadStudentPhoto(studentId: string, fileBuffer: Buffer, mimeType: string) {
  // 1. Validation: JPG, JPEG, PNG, WEBP
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
    throw new Error('Invalid image type. Allowed types: jpg, jpeg, png, webp');
  }

  // 2. Validate upload size under 2MB
  if (fileBuffer.length > 2 * 1024 * 1024) {
    throw new Error('Image size exceeds 2MB limit.');
  }

  // 3. Ensure upload directory exists
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  // 4. Retrieve student record and delete old file if exists
  const student = await prisma.student.findUniqueOrThrow({
    where: { id: studentId },
  });

  if (student.photo) {
    const oldFilePath = path.join(process.cwd(), 'public', 'uploads', student.photo);
    try {
      await fs.unlink(oldFilePath);
    } catch (err) {
      // Ignore if file doesn't exist on disk
    }
  }

  // 5. Resize to max width 800px & Compress to WebP quality 80
  const filename = `student-${studentId}.webp`;
  const relativePath = `students/${filename}`;
  const targetFilePath = path.join(UPLOAD_DIR, filename);

  const sharp = (await import('sharp')).default;
  const processedBuffer = await sharp(fileBuffer)
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  // 6. Ensure target is <300KB
  if (processedBuffer.length > 300 * 1024) {
    const compressedBuffer = await sharp(processedBuffer)
      .webp({ quality: 60 })
      .toBuffer();
    await fs.writeFile(targetFilePath, compressedBuffer);
  } else {
    await fs.writeFile(targetFilePath, processedBuffer);
  }

  // 7. Update Student record in DB
  await prisma.student.update({
    where: { id: studentId },
    data: { photo: relativePath },
  });

  return relativePath;
}

export async function deleteStudentPhoto(studentId: string) {
  const student = await prisma.student.findUniqueOrThrow({
    where: { id: studentId },
  });

  if (student.photo) {
    const filePath = path.join(process.cwd(), 'public', 'uploads', student.photo);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      // Ignore if file doesn't exist
    }

    await prisma.student.update({
      where: { id: studentId },
      data: { photo: null },
    });
  }
}
