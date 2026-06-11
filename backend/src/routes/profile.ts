import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { updateProfileSchema, changePasswordSchema } from '@memento-mori/shared';
import {
  AUTH_COOKIE_NAME,
  ACCESS_TOKEN_MAX_AGE_MS,
  clearSessionCookies,
} from '../lib/auth-session.js';
import { revokeToken } from '../lib/token-denylist.js';
import { requireVerifiedUser } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error.js';
import { imageUpload, assertValidImageFile } from '../middleware/image-upload.js';
import {
  deleteObjectIfExists,
  getThumbKeyForObjectKey,
  isR2ObjectKey,
  processImageBuffers,
  profileObjectKey,
  profileThumbObjectKey,
  putJpegObject,
} from '../services/r2-storage.service.js';
import {
  revokeAllRefreshSessionsForUser,
  sanitizeUser,
  updateUserProfileAfterEmailChange,
  verifyAccessToken,
} from '../services/auth.service.js';
import { normalizeEmail } from '../services/auth-account-linking.js';

const SALT_ROUNDS = 12;

export const profileRouter = Router();

// PUT /api/profile — Update display name & email
profileRouter.put('/', requireVerifiedUser, async (req, res, next) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const normalizedEmail = normalizeEmail(data.email);

    const currentUser = await prisma.user.findUnique({
      where: { id: req.userId! },
    });

    if (!currentUser) {
      throw new AppError(404, 'User not found');
    }

    const emailChanged = normalizeEmail(currentUser.email) !== normalizedEmail;

    // Check if email is already taken by another user
    if (emailChanged) {
      const existing = await prisma.user.findFirst({
        where: {
          email: {
            equals: normalizedEmail,
            mode: 'insensitive',
          },
        },
      });
      if (existing && existing.id !== req.userId) {
        throw new AppError(409, 'This email is already in use by another account');
      }
    }

    const user = emailChanged
      ? await updateUserProfileAfterEmailChange(currentUser, {
        email: normalizedEmail,
        displayName: data.displayName,
      })
      : await prisma.user.update({
        where: { id: req.userId! },
        data: {
          displayName: data.displayName,
          email: normalizedEmail,
        },
      });

    res.json({ user: await sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/profile/password — Change password
profileRouter.put('/password', requireVerifiedUser, async (req, res, next) => {
  try {
    const data = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (!user.passwordHash) {
      throw new AppError(
        400,
        'This account does not have a password yet. Continue using Google sign-in.'
      );
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
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });

    await revokeAllRefreshSessionsForUser(req.userId!, 'PASSWORD_CHANGED');

    // Denylist the current access token so it can't be reused within its 15-min window
    const accessToken = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;
    if (accessToken) {
      try {
        const payload = verifyAccessToken(accessToken);
        revokeToken(payload.jti, ACCESS_TOKEN_MAX_AGE_MS);
      } catch {
        // Token already invalid — nothing to denylist
      }
    }

    clearSessionCookies(res);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/profile/photo — Upload profile photo
profileRouter.post(
  '/photo',
  requireVerifiedUser,
  imageUpload.single('photo'),
  async (req, res, next) => {
    try {
      await assertValidImageFile(req.file);

      const { originalJpeg, thumbnailJpeg } = await processImageBuffers(req.file!.buffer);
      const objectKey = profileObjectKey(req.userId!);
      const thumbKey = profileThumbObjectKey(req.userId!);

      await Promise.all([
        putJpegObject(objectKey, originalJpeg),
        putJpegObject(thumbKey, thumbnailJpeg),
      ]);

      const user = await prisma.user.update({
        where: { id: req.userId! },
        data: { profilePhotoUrl: objectKey },
      });

      res.json({ user: await sanitizeUser(user) });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/profile/photo — Remove profile photo
profileRouter.delete('/photo', requireVerifiedUser, async (req, res, next) => {
  try {
    const existing = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { profilePhotoUrl: true },
    });

    if (isR2ObjectKey(existing?.profilePhotoUrl)) {
      const thumbKey = getThumbKeyForObjectKey(existing.profilePhotoUrl);
      await Promise.all([
        deleteObjectIfExists(existing.profilePhotoUrl),
        deleteObjectIfExists(thumbKey),
      ]);
    }

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: { profilePhotoUrl: null },
    });

    res.json({ user: await sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});
