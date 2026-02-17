import { Router } from 'express';
import { createMemorySchema, paginationQuerySchema } from '@memento-mori/shared';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import {
  assertContributeAccess,
  assertViewAccess,
} from '../services/memorial.service.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error.js';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { param } from '../lib/params.js';

const uploadDir = process.env.UPLOAD_DIR || './uploads';
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
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

// POST /api/memorials/:id/memories/upload — Upload photo memory
memoriesRouter.post(
  '/:id/memories/upload',
  requireAuth,
  upload.single('photo'),
  async (req, res, next) => {
    try {
      await assertContributeAccess(param(req.params.id), req.userId!);

      if (!req.file) {
        throw new AppError(400, 'No file uploaded');
      }

      // Check photo limit
      const photoCount = await prisma.memory.count({
        where: { memorialId: param(req.params.id), type: 'PHOTO' },
      });

      if (photoCount >= MAX_PHOTOS_PER_MEMORIAL) {
        throw new AppError(
          400,
          `Maximum of ${MAX_PHOTOS_PER_MEMORIAL} photos per memorial reached`
        );
      }

      const mediaUrl = `/uploads/${req.file.filename}`;
      const memory = await prisma.memory.create({
        data: {
          memorialId: param(req.params.id),
          authorId: req.userId!,
          type: 'PHOTO',
          mediaUrl,
        },
      });

      res.status(201).json(memory);
    } catch (err) {
      next(err);
    }
  }
);

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

      res.json({
        items,
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
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
