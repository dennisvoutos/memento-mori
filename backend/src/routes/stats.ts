import { Router } from 'express';
import { publicStatsResponseSchema } from '@memento-mori/shared';
import { prisma } from '../lib/prisma.js';

export const statsRouter = Router();

// GET /api/stats/public — global public stats for landing page
statsRouter.get('/public', async (_req, res, next) => {
  try {
    const [memorialCount, candleCount, messageCount] = await Promise.all([
      prisma.memorial.count({ where: { privacyLevel: 'PUBLIC' } }),
      prisma.visitorInteraction.count({ where: { type: 'CANDLE' } }),
      prisma.visitorInteraction.count({ where: { type: 'MESSAGE' } }),
    ]);

    const body = publicStatsResponseSchema.parse({
      memorialCount,
      candleCount,
      messageCount,
    });

    res.json(body);
  } catch (err) {
    next(err);
  }
});
