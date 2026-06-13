import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { AppError } from './error.js';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, _file, cb) => cb(null, true),
});

export async function assertValidImageFile(file?: Express.Multer.File): Promise<void> {
  if (!file) {
    throw new AppError(400, 'No file uploaded');
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new AppError(400, 'Unsupported file type. Use JPEG, PNG, or WebP.');
  }

  const detectedType = await fileTypeFromBuffer(file.buffer);
  if (!detectedType || !ALLOWED_MIME_TYPES.has(detectedType.mime)) {
    throw new AppError(400, 'Invalid image file content.');
  }
}
