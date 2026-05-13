import { Router } from 'express';
import { z } from 'zod';
import { memorialCategorySchema, memorialSubcategorySchema } from '@memento-mori/shared';
import { prisma } from '../lib/prisma.js';
import { getSignedImageUrl, isR2ObjectKey } from '../services/r2-storage.service.js';

const searchQuerySchema = z.object({
  q: z.string().max(200).default(''),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  category: memorialCategorySchema.optional(),
  subcategory: memorialSubcategorySchema.optional(),
});

export const searchRouter = Router();

// GET /api/search?q=name&page=1&limit=12&category=TRIBUTE
searchRouter.get('/', async (req, res, next) => {
  try {
    const { q, page, limit, category, subcategory } = searchQuerySchema.parse(req.query);
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

    // Filter by category when provided
    if (category) {
      where.category = category;
    }

    // Filter by subcategory when provided
    if (subcategory) {
      where.subcategory = subcategory;
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
          category: true,
          subcategory: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.memorial.count({ where }),
    ]);

    const signedItems = await Promise.all(
      items.map(async (item) => {
        if (!isR2ObjectKey(item.profilePhotoUrl)) {
          return item;
        }

        return {
          ...item,
          profilePhotoUrl: (await getSignedImageUrl(item.profilePhotoUrl)).url,
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
});
