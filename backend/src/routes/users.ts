import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { imageUpload, assertValidImageFile } from '../middleware/image-upload.js';
import { prisma } from '../lib/prisma.js';
import {
  deleteObjectIfExists,
  getSignedImageUrl,
  getThumbKeyForObjectKey,
  isR2ObjectKey,
  processImageBuffers,
  profileObjectKey,
  profileThumbObjectKey,
  putJpegObject,
} from '../services/r2-storage.service.js';

export const usersRouter = Router();

usersRouter.post(
  '/profile-picture',
  requireAuth,
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

      const signed = await getSignedImageUrl(objectKey);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          profilePhotoUrl: signed.url,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        expiresAt: signed.expiresAt,
      });
    } catch (err) {
      next(err);
    }
  }
);

usersRouter.delete('/profile-picture', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { profilePhotoUrl: true },
    });

    if (user?.profilePhotoUrl && isR2ObjectKey(user.profilePhotoUrl)) {
      const thumbKey = getThumbKeyForObjectKey(user.profilePhotoUrl);
      await Promise.all([
        deleteObjectIfExists(user.profilePhotoUrl),
        deleteObjectIfExists(thumbKey),
      ]);
    }

    const updated = await prisma.user.update({
      where: { id: req.userId! },
      data: { profilePhotoUrl: null },
    });

    res.json({
      user: {
        id: updated.id,
        email: updated.email,
        displayName: updated.displayName,
        profilePhotoUrl: null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});
