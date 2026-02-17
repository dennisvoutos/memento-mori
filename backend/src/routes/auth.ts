import { Router } from 'express';
import { registerSchema, loginSchema } from '@memento-mori/shared';
import {
  registerUser,
  loginUser,
  getUserById,
  getCookieOptions,
} from '../services/auth.service.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const { user, token } = await registerUser(
      data.email,
      data.password,
      data.displayName
    );
    res.cookie('token', token, getCookieOptions());
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const { user, token } = await loginUser(data.email, data.password);
    res.cookie('token', token, getCookieOptions());
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
authRouter.post('/logout', (_req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await getUserById(req.userId!);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// ── GDPR: Data Export ──
// GET /api/auth/export
authRouter.get('/export', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      include: {
        memorials: {
          include: {
            lifeMoments: true,
            memories: true,
            access: true,
            interactions: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Strip sensitive fields
    const { passwordHash, ...exported } = user;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="memento-mori-export-${Date.now()}.json"`
    );
    res.json(exported);
  } catch (err) {
    next(err);
  }
});

// ── GDPR: Delete Account ──
// DELETE /api/auth/account
authRouter.delete('/account', requireAuth, async (req, res, next) => {
  try {
    // Cascade deletes + user deletion in transaction
    await prisma.$transaction(async (tx: { memorial: { findMany: (arg0: { where: { ownerId: string; }; select: { id: boolean; }; }) => any; deleteMany: (arg0: { where: { ownerId: string; }; }) => any; }; visitorInteraction: { deleteMany: (arg0: { where: { memorialId: { in: any; }; }; }) => any; }; memory: { deleteMany: (arg0: { where: { memorialId: { in: any; }; }; }) => any; }; memorialAccess: { deleteMany: (arg0: { where: { memorialId: { in: any; }; }; }) => any; }; lifeMoment: { deleteMany: (arg0: { where: { memorialId: { in: any; }; }; }) => any; }; user: { delete: (arg0: { where: { id: string; }; }) => any; }; }) => {
      // Get all memorial IDs for this user
      const memorials = await tx.memorial.findMany({
        where: { ownerId: req.userId! },
        select: { id: true },
      });
      const memorialIds = memorials.map((m: { id: any; }) => m.id);

      // Delete interactions
      await tx.visitorInteraction.deleteMany({
        where: { memorialId: { in: memorialIds } },
      });

      // Delete memories
      await tx.memory.deleteMany({
        where: { memorialId: { in: memorialIds } },
      });

      // Delete access records
      await tx.memorialAccess.deleteMany({
        where: { memorialId: { in: memorialIds } },
      });

      // Delete life moments
      await tx.lifeMoment.deleteMany({
        where: { memorialId: { in: memorialIds } },
      });

      // Delete memorials
      await tx.memorial.deleteMany({
        where: { ownerId: req.userId! },
      });

      // Delete user
      await tx.user.delete({
        where: { id: req.userId! },
      });
    });

    res.clearCookie('token', { path: '/' });
    res.json({ message: 'Account and all data deleted' });
  } catch (err) {
    next(err);
  }
});
