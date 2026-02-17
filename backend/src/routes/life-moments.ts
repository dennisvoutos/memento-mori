import { Router } from 'express';
import {
  createLifeMomentSchema,
  updateLifeMomentSchema,
  reorderLifeMomentsSchema,
} from '@memento-mori/shared';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import {
  assertAdminAccess,
  assertViewAccess,
} from '../services/memorial.service.js';
import { prisma } from '../lib/prisma.js';
import { param } from '../lib/params.js';

export const lifeMomentsRouter = Router();

// POST /api/memorials/:id/life-moments
lifeMomentsRouter.post(
  '/:id/life-moments',
  requireAuth,
  async (req, res, next) => {
    try {
      await assertAdminAccess(param(req.params.id), req.userId!);
      const data = createLifeMomentSchema.parse(req.body);

      // Auto-assign sort order if not provided
      if (data.sortOrder === undefined) {
        const lastMoment = await prisma.lifeMoment.findFirst({
          where: { memorialId: param(req.params.id) },
          orderBy: { sortOrder: 'desc' },
        });
        data.sortOrder = (lastMoment?.sortOrder ?? -1) + 1;
      }

      const moment = await prisma.lifeMoment.create({
        data: {
          memorialId: param(req.params.id),
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
      await assertViewAccess(param(req.params.id), req.userId);

      const moments = await prisma.lifeMoment.findMany({
        where: { memorialId: param(req.params.id) },
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
  requireAuth,
  async (req, res, next) => {
    try {
      await assertAdminAccess(param(req.params.id), req.userId!);
      const data = updateLifeMomentSchema.parse(req.body);

      const moment = await prisma.lifeMoment.update({
        where: { id: param(req.params.momentId) },
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
  requireAuth,
  async (req, res, next) => {
    try {
      await assertAdminAccess(param(req.params.id), req.userId!);
      await prisma.lifeMoment.delete({ where: { id: param(req.params.momentId) } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/memorials/:id/life-moments/reorder
lifeMomentsRouter.put(
  '/:id/life-moments-reorder',
  requireAuth,
  async (req, res, next) => {
    try {
      await assertAdminAccess(param(req.params.id), req.userId!);
      const { moments } = reorderLifeMomentsSchema.parse(req.body);

      await prisma.$transaction(
        moments.map((m) =>
          prisma.lifeMoment.update({
            where: { id: m.id },
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
