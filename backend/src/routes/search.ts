import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const searchQuerySchema = z.object({
  q: z.string().max(200).default(''),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const searchRouter = Router();

// GET /api/search?q=name&page=1&limit=12
searchRouter.get('/', async (req, res, next) => {
  try {
    const { q, page, limit } = searchQuerySchema.parse(req.query);
    const skip = (page - 1) * limit;

    // Prisma parameterized queries — safe from SQL injection
    const where: any = {
      privacyLevel: 'PUBLIC' as const,
    };

    // Only filter by name when a query is provided
    if (q.trim()) {
      where.fullName = {
        contains: q.trim(),
        mode: 'insensitive',
      };
    }

    const [items, total] = await Promise.all([
      prisma.memorial.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          dateOfBirth: true,
          dateOfPassing: true,
          biography: true,
          profilePhotoUrl: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.memorial.count({ where }),
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
});
