import { Router } from 'express';
import {
  createLifeMomentSchema,
  updateLifeMomentSchema,
  reorderLifeMomentsSchema,
} from '@memento-mori/shared';
import { requireVerifiedUser, optionalAuth } from '../middleware/auth.js';
import {
  assertAdminAccess,
  assertViewAccess,
} from '../services/memorial.service.js';
import { prisma } from '../lib/prisma.js';
import { paramUUID } from '../lib/params.js';
import { AppError } from '../middleware/error.js';

export const lifeMomentsRouter = Router();

// POST /api/memorials/:id/life-moments
lifeMomentsRouter.post(
  '/:id/life-moments',
  requireVerifiedUser,
  async (req, res, next) => {
    try {
      await assertAdminAccess(paramUUID(req.params.id), req.userId!);
      const data = createLifeMomentSchema.parse(req.body);

      // Auto-assign sort order if not provided
      if (data.sortOrder === undefined) {
        const lastMoment = await prisma.lifeMoment.findFirst({
          where: { memorialId: paramUUID(req.params.id) },
          orderBy: { sortOrder: 'desc' },
        });
        data.sortOrder = (lastMoment?.sortOrder ?? -1) + 1;
      }

      const moment = await prisma.lifeMoment.create({
        data: {
          memorialId: paramUUID(req.params.id),
          title: data.title,
          description: data.description ?? null,
          date: data.date,
          sortOrder: data.sortOrder,
        },
      });

      res.status(201).json(moment);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/memorials/:id/life-moments
lifeMomentsRouter.get(
  '/:id/life-moments',
  optionalAuth,
  async (req, res, next) => {
    try {
      await assertViewAccess(paramUUID(req.params.id), req.userId);

      const moments = await prisma.lifeMoment.findMany({
        where: { memorialId: paramUUID(req.params.id) },
        orderBy: [{ sortOrder: 'asc' }, { date: 'asc' }],
      });

      res.json(moments);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/memorials/:id/life-moments/:momentId
lifeMomentsRouter.put(
  '/:id/life-moments/:momentId',
  requireVerifiedUser,
  async (req, res, next) => {
    try {
      await assertAdminAccess(paramUUID(req.params.id), req.userId!);
      const data = updateLifeMomentSchema.parse(req.body);

      const existing = await prisma.lifeMoment.findFirst({
        where: {
          id: paramUUID(req.params.momentId),
          memorialId: paramUUID(req.params.id),
        },
      });

      if (!existing) {
        throw new AppError(404, 'Life moment not found for this memorial');
      }

      const moment = await prisma.lifeMoment.update({
        where: { id: paramUUID(req.params.momentId) },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.date !== undefined && { date: data.date }),
          ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        },
      });

      res.json(moment);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/memorials/:id/life-moments/:momentId
lifeMomentsRouter.delete(
  '/:id/life-moments/:momentId',
  requireVerifiedUser,
  async (req, res, next) => {
    try {
      await assertAdminAccess(paramUUID(req.params.id), req.userId!);
      const result = await prisma.lifeMoment.deleteMany({
        where: {
          id: paramUUID(req.params.momentId),
          memorialId: paramUUID(req.params.id),
        },
      });

      if (result.count === 0) {
        throw new AppError(404, 'Life moment not found for this memorial');
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/memorials/:id/life-moments/reorder
lifeMomentsRouter.put(
  '/:id/life-moments-reorder',
  requireVerifiedUser,
  async (req, res, next) => {
    try {
      await assertAdminAccess(paramUUID(req.params.id), req.userId!);
      const { moments } = reorderLifeMomentsSchema.parse(req.body);

      const memorialId = paramUUID(req.params.id);
      const requestedIds = moments.map((m) => m.id);
      const uniqueRequestedIds = new Set(requestedIds);

      if (uniqueRequestedIds.size !== requestedIds.length) {
        throw new AppError(400, 'Duplicate life moment IDs are not allowed');
      }

      const existingMoments = await prisma.lifeMoment.findMany({
        where: {
          memorialId,
          id: { in: requestedIds },
        },
        select: { id: true },
      });

      if (existingMoments.length !== requestedIds.length) {
        throw new AppError(404, 'One or more life moments do not belong to this memorial');
      }

      await prisma.$transaction(
        moments.map((m) =>
          prisma.lifeMoment.updateMany({
            where: {
              id: m.id,
              memorialId,
            },
            data: { sortOrder: m.sortOrder },
          })
        )
      );

      res.json({ message: 'Reordered successfully' });
    } catch (err) {
      next(err);
    }
  }
);
