import { Router } from 'express';
import { registerSchema, loginSchema } from '@memento-mori/shared';
import { z } from 'zod';
import {
  registerUser,
  loginUser,
  loginOrRegisterWithGoogle,
  getUserById,
  getCookieOptions,
} from '../services/auth.service.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import {
  buildGoogleErrorRedirectUrl,
  buildGoogleSuccessRedirectUrl,
  exchangeGoogleCodeForProfile,
  getPublicGoogleClientConfig,
  getGoogleAuthorizationUrl,
  mapGoogleAuthErrorCode,
  parseGoogleOAuthState,
  sanitizeGoogleEntryPath,
  sanitizeGoogleRedirectPath,
  type GoogleEntryPath,
  verifyGoogleIdToken,
} from '../services/google-oauth.service.js';

export const authRouter = Router();

const googleCredentialSchema = z.object({
  credential: z.string().min(1, 'Google credential is required'),
});

// GET /api/auth/google/config
authRouter.get('/google/config', (_req, res, next) => {
  try {
    res.json(getPublicGoogleClientConfig());
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/google
authRouter.get('/google', (req, res) => {
  const entryPath = sanitizeGoogleEntryPath(req.query.entryPath);
  const redirectTo = sanitizeGoogleRedirectPath(req.query.redirectTo);

  try {
    res.redirect(
      getGoogleAuthorizationUrl({
        entryPath,
        redirectTo,
      })
    );
  } catch (error) {
    res.redirect(
      buildGoogleErrorRedirectUrl({
        entryPath,
        redirectTo,
        errorCode: mapGoogleAuthErrorCode(error),
      })
    );
  }
});

// POST /api/auth/google/credential
authRouter.post('/google/credential', async (req, res, next) => {
  try {
    const { credential } = googleCredentialSchema.parse(req.body);
    const profile = await verifyGoogleIdToken(credential);
    const { user, token } = await loginOrRegisterWithGoogle(profile);

    res.cookie('token', token, getCookieOptions());
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/google/callback
authRouter.get('/google/callback', async (req, res) => {
  const rawState = typeof req.query.state === 'string' ? req.query.state : '';

  let state: { entryPath: GoogleEntryPath; redirectTo: string } = {
    entryPath: '/login',
    redirectTo: '/dashboard',
  };

  try {
    if (rawState) {
      state = parseGoogleOAuthState(rawState);
    }

    if (req.query.error) {
      res.redirect(
        buildGoogleErrorRedirectUrl({
          entryPath: state.entryPath,
          redirectTo: state.redirectTo,
          errorCode: 'google_access_denied',
        })
      );
      return;
    }

    const code = typeof req.query.code === 'string' ? req.query.code : '';
    if (!code) {
      throw new AppError(400, 'Google sign-in failed');
    }

    const profile = await exchangeGoogleCodeForProfile(code);
    const { token } = await loginOrRegisterWithGoogle(profile);

    res.cookie('token', token, getCookieOptions());
    res.redirect(buildGoogleSuccessRedirectUrl(state.redirectTo));
  } catch (error) {
    res.redirect(
      buildGoogleErrorRedirectUrl({
        entryPath: state.entryPath,
        redirectTo: state.redirectTo,
        errorCode: mapGoogleAuthErrorCode(error),
      })
    );
  }
});

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
    res.status(201).json({ user, token });
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
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
authRouter.post('/logout', (_req, res) => {
  res.clearCookie('token', getCookieOptions());
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
