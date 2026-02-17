import { Router } from 'express';
import {
  createInteractionSchema,
  paginationQuerySchema,
} from '@memento-mori/shared';
import { optionalAuth } from '../middleware/auth.js';
import { assertViewAccess } from '../services/memorial.service.js';
import { prisma } from '../lib/prisma.js';
import { param } from '../lib/params.js';

export const interactionsRouter = Router();

// POST /api/memorials/:id/interactions
interactionsRouter.post(
  '/:id/interactions',
  optionalAuth,
  async (req, res, next) => {
    try {
      await assertViewAccess(param(req.params.id), req.userId);
      const data = createInteractionSchema.parse(req.body);

      const interaction = await prisma.visitorInteraction.create({
        data: {
          memorialId: param(req.params.id),
          visitorId: req.userId ?? null,
          type: data.type,
          content: 'content' in data ? data.content : null,
          reactionEmoji:
            'reactionEmoji' in data ? data.reactionEmoji : null,
        },
      });

      res.status(201).json(interaction);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/memorials/:id/interactions
interactionsRouter.get(
  '/:id/interactions',
  optionalAuth,
  async (req, res, next) => {
    try {
      await assertViewAccess(param(req.params.id), req.userId);
      const { page, limit } = paginationQuerySchema.parse(req.query);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        prisma.visitorInteraction.findMany({
          where: { memorialId: param(req.params.id) },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            visitor: {
              select: { id: true, displayName: true },
            },
          },
        }),
        prisma.visitorInteraction.count({
          where: { memorialId: param(req.params.id) },
        }),
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

// GET /api/memorials/:id/stats
interactionsRouter.get(
  '/:id/stats',
  optionalAuth,
  async (req, res, next) => {
    try {
      await assertViewAccess(param(req.params.id), req.userId);

      const [totalMemories, totalCandles, totalMessages, totalVisitors] =
        await Promise.all([
          prisma.memory.count({ where: { memorialId: param(req.params.id) } }),
          prisma.visitorInteraction.count({
            where: { memorialId: param(req.params.id), type: 'CANDLE' },
          }),
          prisma.visitorInteraction.count({
            where: { memorialId: param(req.params.id), type: 'MESSAGE' },
          }),
          prisma.visitorInteraction
            .groupBy({
              by: ['visitorId'],
              where: {
                memorialId: param(req.params.id),
                visitorId: { not: null },
              },
            })
            .then((groups: string | any[]) => groups.length),
        ]);

      res.json({
        totalMemories,
        totalCandles,
        totalMessages,
        totalVisitors,
      });
    } catch (err) {
      next(err);
    }
  }
);
