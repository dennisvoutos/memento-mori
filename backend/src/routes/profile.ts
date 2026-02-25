import { Router } from 'express';
import bcrypt from 'bcrypt';
import { updateProfileSchema, changePasswordSchema } from '@memento-mori/shared';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error.js';
import type { User } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const SALT_ROUNDS = 12;

const uploadDir = process.env.UPLOAD_DIR || './uploads';
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${uuidv4()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

function sanitizeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    profilePhotoUrl: user.profilePhotoUrl,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export const profileRouter = Router();

// PUT /api/profile — Update display name & email
profileRouter.put('/', requireAuth, async (req, res, next) => {
  try {
    const data = updateProfileSchema.parse(req.body);

    // Check if email is already taken by another user
    if (data.email) {
      const existing = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existing && existing.id !== req.userId) {
        throw new AppError(409, 'This email is already in use by another account');
      }
    }

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: {
        displayName: data.displayName,
        email: data.email,
      },
    });

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/profile/password — Change password
profileRouter.put('/password', requireAuth, async (req, res, next) => {
  try {
    const data = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Verify current password
    const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'Current password is incorrect');
    }

    // Hash new password and update
    const passwordHash = await bcrypt.hash(data.newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: req.userId! },
      data: { passwordHash },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/profile/photo — Upload profile photo
profileRouter.post(
  '/photo',
  requireAuth,
  upload.single('photo'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new AppError(400, 'No file uploaded');
      }

      const mediaUrl = `/uploads/${req.file.filename}`;
      const user = await prisma.user.update({
        where: { id: req.userId! },
        data: { profilePhotoUrl: mediaUrl },
      });

      res.json({ user: sanitizeUser(user) });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/profile/photo — Remove profile photo
profileRouter.delete('/photo', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: { profilePhotoUrl: null },
    });

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});
