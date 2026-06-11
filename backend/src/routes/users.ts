import { Router } from 'express';
import { requireVerifiedUser } from '../middleware/auth.js';
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
import { sanitizeUser } from '../services/auth.service.js';

export const usersRouter = Router();

usersRouter.post(
  '/profile-picture',
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

      const signed = await getSignedImageUrl(objectKey);
      const sanitizedUser = await sanitizeUser(user);

      res.json({
        user: {
          ...sanitizedUser,
          profilePhotoUrl: signed.url,
        },
        expiresAt: signed.expiresAt,
      });
    } catch (err) {
      next(err);
    }
  }
);

usersRouter.delete('/profile-picture', requireVerifiedUser, async (req, res, next) => {
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
      user: await sanitizeUser(updated),
    });
  } catch (err) {
    next(err);
  }
});
