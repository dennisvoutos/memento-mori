import { Router } from 'express';
import { createMemorySchema, paginationQuerySchema } from '@memento-mori/shared';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import {
  assertContributeAccess,
  assertViewAccess,
} from '../services/memorial.service.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error.js';
import { v4 as uuidv4 } from 'uuid';
import { param } from '../lib/params.js';
import { imageUpload, assertValidImageFile } from '../middleware/image-upload.js';
import {
  deleteObjectIfExists,
  getSignedImageUrl,
  getThumbKeyForObjectKey,
  isR2ObjectKey,
  memorialObjectKey,
  memorialThumbObjectKey,
  processImageBuffers,
  putJpegObject,
} from '../services/r2-storage.service.js';
import rateLimit from 'express-rate-limit';

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many image uploads, please try again later.' },
});

const MAX_PHOTOS_PER_MEMORIAL = 50;

export const memoriesRouter = Router();

// POST /api/memorials/:id/memories — Create text memory
memoriesRouter.post(
  '/:id/memories',
  requireAuth,
  async (req, res, next) => {
    try {
      await assertContributeAccess(param(req.params.id), req.userId!);
      const data = createMemorySchema.parse(req.body);

      const memory = await prisma.memory.create({
        data: {
          memorialId: param(req.params.id),
          authorId: req.userId!,
          type: data.type,
          content: data.content,
        },
      });

      res.status(201).json(memory);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/memorials/:id/memories/upload — Upload photo memory (owner only)
memoriesRouter.post(
  '/:id/memories/upload',
  requireAuth,
  uploadLimiter,
  imageUpload.single('photo'),
  async (req, res, next) => {
    try {
      const memorialId = param(req.params.id);
      await assertContributeAccess(memorialId, req.userId!);
      await assertValidImageFile(req.file);

      // Check photo limit
      const photoCount = await prisma.memory.count({
        where: { memorialId, type: 'PHOTO' },
      });

      if (photoCount >= MAX_PHOTOS_PER_MEMORIAL) {
        throw new AppError(
          400,
          `Maximum of ${MAX_PHOTOS_PER_MEMORIAL} photos per memorial reached`
        );
      }

      const imageId = uuidv4();
      const objectKey = memorialObjectKey(memorialId, imageId);
      const thumbKey = memorialThumbObjectKey(memorialId, imageId);
      const { originalJpeg, thumbnailJpeg } = await processImageBuffers(req.file!.buffer);

      await Promise.all([
        putJpegObject(objectKey, originalJpeg),
        putJpegObject(thumbKey, thumbnailJpeg),
      ]);

      const caption = typeof req.body.caption === 'string' ? req.body.caption.trim() || null : null;
      const content = typeof req.body.content === 'string' ? req.body.content.trim() || null : null;

      const memory = await prisma.memory.create({
        data: {
          id: imageId,
          memorialId,
          authorId: req.userId!,
          type: 'PHOTO',
          mediaUrl: objectKey,
          caption,
          content,
        },
      });

      const signed = await getSignedImageUrl(objectKey);

      res.status(201).json({
        ...memory,
        mediaUrl: signed.url,
        expiresAt: signed.expiresAt,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/memorials/:id/images — Upload memorial image
memoriesRouter.post(
  '/:id/images',
  requireAuth,
  uploadLimiter,
  imageUpload.single('image'),
  async (req, res, next) => {
    try {
      const memorialId = param(req.params.id);
      await assertContributeAccess(memorialId, req.userId!);
      await assertValidImageFile(req.file);

      const photoCount = await prisma.memory.count({
        where: { memorialId, type: 'PHOTO' },
      });
      if (photoCount >= MAX_PHOTOS_PER_MEMORIAL) {
        throw new AppError(400, `Maximum of ${MAX_PHOTOS_PER_MEMORIAL} photos per memorial reached`);
      }

      const imageId = uuidv4();
      const objectKey = memorialObjectKey(memorialId, imageId);
      const thumbKey = memorialThumbObjectKey(memorialId, imageId);
      const { originalJpeg, thumbnailJpeg } = await processImageBuffers(req.file!.buffer);
      await Promise.all([
        putJpegObject(objectKey, originalJpeg),
        putJpegObject(thumbKey, thumbnailJpeg),
      ]);

      const caption = typeof req.body.caption === 'string' ? req.body.caption.trim() || null : null;
      const content = typeof req.body.content === 'string' ? req.body.content.trim() || null : null;

      const image = await prisma.memory.create({
        data: {
          id: imageId,
          memorialId,
          authorId: req.userId!,
          type: 'PHOTO',
          mediaUrl: objectKey,
          caption,
          content,
        },
      });

      const signed = await getSignedImageUrl(objectKey);
      const signedThumb = await getSignedImageUrl(thumbKey);

      res.status(201).json({
        imageId,
        memorialId,
        caption: image.caption,
        content: image.content,
        url: signed.url,
        thumbnailUrl: signedThumb.url,
        objectKey,
        expiresAt: signed.expiresAt,
        createdAt: image.createdAt,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/memorials/:id/images — List memorial image signed URLs
memoriesRouter.get('/:id/images', optionalAuth, async (req, res, next) => {
  try {
    const memorialId = param(req.params.id);
    await assertViewAccess(memorialId, req.userId);

    const images = await prisma.memory.findMany({
      where: { memorialId, type: 'PHOTO' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        memorialId: true,
        caption: true,
        content: true,
        mediaUrl: true,
        createdAt: true,
        author: { select: { id: true, displayName: true } },
      },
    });

    const items = await Promise.all(
      images.map(async (img) => {
        if (!img.mediaUrl) {
          return {
            imageId: img.id,
            memorialId: img.memorialId,
            caption: img.caption,
            content: img.content,
            url: null,
            thumbnailUrl: null,
            expiresAt: null,
            createdAt: img.createdAt,
            author: img.author,
          };
        }

        if (!isR2ObjectKey(img.mediaUrl)) {
          return {
            imageId: img.id,
            memorialId: img.memorialId,
            caption: img.caption,
            content: img.content,
            url: img.mediaUrl,
            thumbnailUrl: null,
            expiresAt: null,
            createdAt: img.createdAt,
            author: img.author,
          };
        }

        const signed = await getSignedImageUrl(img.mediaUrl);
        const thumbKey = getThumbKeyForObjectKey(img.mediaUrl);
        const signedThumb = thumbKey ? await getSignedImageUrl(thumbKey) : null;

        return {
          imageId: img.id,
          memorialId: img.memorialId,
          caption: img.caption,
          content: img.content,
          url: signed.url,
          thumbnailUrl: signedThumb?.url ?? null,
          expiresAt: signed.expiresAt,
          createdAt: img.createdAt,
          author: img.author,
        };
      })
    );

    res.json({ items });
  } catch (err) {
    next(err);
  }
});

// GET /api/memorials/:id/memories — List memories (paginated)
memoriesRouter.get(
  '/:id/memories',
  optionalAuth,
  async (req, res, next) => {
    try {
      await assertViewAccess(param(req.params.id), req.userId);
      const { page, limit } = paginationQuerySchema.parse(req.query);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        prisma.memory.findMany({
          where: { memorialId: param(req.params.id) },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            author: {
              select: { id: true, displayName: true },
            },
          },
        }),
        prisma.memory.count({ where: { memorialId: param(req.params.id) } }),
      ]);

      const signedItems = await Promise.all(
        items.map(async (item) => {
          if (item.type !== 'PHOTO' || !item.mediaUrl || !isR2ObjectKey(item.mediaUrl)) {
            return item;
          }

          const signed = await getSignedImageUrl(item.mediaUrl);
          return {
            ...item,
            mediaUrl: signed.url,
          };
        })
      );

      res.json({
        items: signedItems,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/memorials/:id/memories/:memoryId
memoriesRouter.delete(
  '/:id/memories/:memoryId',
  requireAuth,
  async (req, res, next) => {
    try {
      const memory = await prisma.memory.findUnique({
        where: { id: param(req.params.memoryId) },
      });

      if (!memory) {
        throw new AppError(404, 'Memory not found');
      }

      if (memory.memorialId !== param(req.params.id)) {
        throw new AppError(404, 'Memory not found for this memorial');
      }

      // Author or admin can delete
      if (memory.authorId !== req.userId) {
        const memorial = await prisma.memorial.findUnique({
          where: { id: param(req.params.id) },
        });
        if (memorial?.ownerId !== req.userId) {
          const access = await prisma.memorialAccess.findFirst({
            where: {
              memorialId: param(req.params.id),
              userId: req.userId,
              permission: 'ADMIN',
            },
          });
          if (!access) {
            throw new AppError(403, 'Not authorized to delete this memory');
          }
        }
      }

      await prisma.memory.delete({ where: { id: param(req.params.memoryId) } });

      if (memory.type === 'PHOTO' && isR2ObjectKey(memory.mediaUrl)) {
        const thumbKey = getThumbKeyForObjectKey(memory.mediaUrl);
        await Promise.all([
          deleteObjectIfExists(memory.mediaUrl),
          deleteObjectIfExists(thumbKey),
        ]);
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/memorials/:id/images/:imageId
memoriesRouter.delete('/:id/images/:imageId', requireAuth, async (req, res, next) => {
  try {
    const memorialId = param(req.params.id);
    const imageId = param(req.params.imageId);

    const image = await prisma.memory.findFirst({
      where: {
        id: imageId,
        memorialId,
        type: 'PHOTO',
      },
    });

    if (!image) {
      throw new AppError(404, 'Memorial image not found');
    }

    if (image.authorId !== req.userId) {
      const memorial = await prisma.memorial.findUnique({ where: { id: memorialId } });
      if (!memorial) {
        throw new AppError(404, 'Memorial not found');
      }

      if (memorial.ownerId !== req.userId) {
        const adminAccess = await prisma.memorialAccess.findFirst({
          where: {
            memorialId,
            userId: req.userId,
            permission: 'ADMIN',
          },
        });
        if (!adminAccess) {
          throw new AppError(403, 'Not authorized to delete this image');
        }
      }
    }

    await prisma.memory.delete({ where: { id: imageId } });

    if (isR2ObjectKey(image.mediaUrl)) {
      const thumbKey = getThumbKeyForObjectKey(image.mediaUrl);
      await Promise.all([
        deleteObjectIfExists(image.mediaUrl),
        deleteObjectIfExists(thumbKey),
      ]);
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
