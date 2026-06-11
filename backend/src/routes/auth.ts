import { Router, type Request } from 'express';
import {
  registerSchema,
  loginSchema,
  resendVerificationSchema,
  verifyEmailQuerySchema,
  forgotPasswordSchema,
  resetPasswordTokenQuerySchema,
  resetPasswordSchema,
} from '@memento-mori/shared';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import {
  registerUser,
  loginUser,
  loginOrRegisterWithGoogle,
  getUserById,
  refreshUserSession,
  revokeRefreshSessionByToken,
  resendVerificationEmailForAccount,
  verifyEmailAddress,
  verifyAccessToken,
  initiatePasswordReset,
  validateResetToken,
  resetPassword,
} from '../services/auth.service.js';
import {
  AUTH_COOKIE_NAME,
  ACCESS_TOKEN_MAX_AGE_MS,
  CSRF_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  clearSessionCookies,
  ensureCsrfToken,
  setSessionCookies,
  setCsrfCookie,
} from '../lib/auth-session.js';
import { revokeToken } from '../lib/token-denylist.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import {
  deleteObject,
  getThumbKeyForObjectKey,
  isR2ObjectKey,
} from '../services/r2-storage.service.js';
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
const resendVerificationSuccessMessage =
  'If an account with that email exists and is unverified, a new verification link has been sent.';

function getRequestSessionContext(req: Request) {
  return {
    userAgent: req.get('user-agent') ?? null,
    ipAddress: req.ip || req.socket.remoteAddress || null,
  };
}

const googleCredentialSchema = z.object({
  credential: z.string().min(1, 'Google credential is required'),
});

const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : 'unknown';
    return `${req.ip}:${email}`;
  },
  message: { message: 'Too many verification email requests. Please try again later.' },
});

const forgotPasswordRateLimitWindowMinutes = (() => {
  const parsed = Number.parseInt(
    process.env.FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MINUTES?.trim() || '',
    10
  );
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
})();

const forgotPasswordRateLimitMax = (() => {
  const parsed = Number.parseInt(
    process.env.FORGOT_PASSWORD_RATE_LIMIT_MAX?.trim() || '',
    10
  );
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
})();

const forgotPasswordLimiter = rateLimit({
  windowMs: forgotPasswordRateLimitWindowMinutes * 60 * 1000,
  max: forgotPasswordRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: { message: 'If an account exists, a reset email has been sent.' },
});

// GET /api/auth/csrf
authRouter.get('/csrf', (req, res) => {
  const csrfToken = ensureCsrfToken(
    req.cookies?.[CSRF_COOKIE_NAME] as string | undefined
  );
  setCsrfCookie(res, csrfToken);
  res.json({ csrfToken });
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
    const { user, accessToken, refreshToken } =
      await loginOrRegisterWithGoogle(profile, getRequestSessionContext(req));

    setSessionCookies(res, accessToken, refreshToken);
    res.json({ user });
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
    const { accessToken, refreshToken } =
      await loginOrRegisterWithGoogle(profile, getRequestSessionContext(req));

    setSessionCookies(res, accessToken, refreshToken);
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
    const { user, accessToken, refreshToken } = await registerUser(
      data.email,
      data.password,
      data.displayName,
      getRequestSessionContext(req)
    );
    setSessionCookies(res, accessToken, refreshToken);
    res.status(201).json({
      user,
      message: user.emailVerified
        ? 'User registered successfully.'
        : 'User registered. Verification email sent.',
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/verify-email
authRouter.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = verifyEmailQuerySchema.parse(req.query);
    await verifyEmailAddress(token);
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/resend-verification
authRouter.post(
  '/resend-verification',
  resendVerificationLimiter,
  async (req, res, next) => {
    try {
      const { email } = resendVerificationSchema.parse(req.body);
      await resendVerificationEmailForAccount(email);
      res.json({ message: resendVerificationSuccessMessage });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/forgot-password
authRouter.post(
  '/forgot-password',
  forgotPasswordLimiter,
  async (req, res, next) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      await initiatePasswordReset(email);
      res.json({ message: 'If an account exists, a reset email has been sent.' });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/reset-password/validate
authRouter.get('/reset-password/validate', async (req, res, next) => {
  try {
    const { token } = resetPasswordTokenQuerySchema.parse(req.query);
    const result = await validateResetToken(token);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password
authRouter.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    await resetPassword(token, newPassword);

    // Denylist the current access token if present
    const accessToken = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;
    if (accessToken) {
      try {
        const payload = verifyAccessToken(accessToken);
        revokeToken(payload.jti, ACCESS_TOKEN_MAX_AGE_MS);
      } catch {
        // Token already invalid — nothing to denylist
      }
    }

    clearSessionCookies(res);
    res.json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await loginUser(
      data.email,
      data.password,
      getRequestSessionContext(req)
    );
    setSessionCookies(res, accessToken, refreshToken);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
authRouter.post('/refresh', async (req, res, next) => {
  const incomingRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as
    | string
    | undefined;

  if (!incomingRefreshToken) {
    clearSessionCookies(res);
    next(new AppError(401, 'Refresh token required'));
    return;
  }

  try {
    const { accessToken, refreshToken } = await refreshUserSession(
      incomingRefreshToken,
      getRequestSessionContext(req)
    );

    setSessionCookies(res, accessToken, refreshToken);
    res.json({ message: 'Session refreshed' });
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 401) {
      clearSessionCookies(res);
    }

    next(err);
  }
});

// POST /api/auth/logout
authRouter.post('/logout', async (req, res, next) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  const accessToken = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;

  try {
    if (refreshToken) {
      await revokeRefreshSessionByToken(refreshToken, 'LOGOUT');
    }

    // Denylist the access token so it can't be reused within its 15-min window
    if (accessToken) {
      try {
        const payload = verifyAccessToken(accessToken);
        revokeToken(payload.jti, ACCESS_TOKEN_MAX_AGE_MS);
      } catch {
        // Token already invalid — nothing to denylist
      }
    }
  } catch (err) {
    next(err);
    return;
  }

  clearSessionCookies(res);
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
    const { passwordHash, resetPasswordToken, resetPasswordExpires, ...exported } = user;

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
    const userId = req.userId!;

    // Collect R2 object keys to delete before removing DB rows
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePhotoUrl: true },
    });

    const memorials = await prisma.memorial.findMany({
      where: { ownerId: userId },
      select: {
        id: true,
        profilePhotoUrl: true,
        memories: {
          where: { type: 'PHOTO' },
          select: { mediaUrl: true },
        },
      },
    });

    const r2Keys: string[] = [];

    // User's profile photo + thumb
    if (isR2ObjectKey(user?.profilePhotoUrl)) {
      r2Keys.push(user.profilePhotoUrl);
      const thumbKey = getThumbKeyForObjectKey(user.profilePhotoUrl);
      if (thumbKey) r2Keys.push(thumbKey);
    }

    for (const memorial of memorials) {
      // Memorial's profile photo + thumb
      if (isR2ObjectKey(memorial.profilePhotoUrl)) {
        r2Keys.push(memorial.profilePhotoUrl);
        const thumbKey = getThumbKeyForObjectKey(memorial.profilePhotoUrl);
        if (thumbKey) r2Keys.push(thumbKey);
      }

      // Photo memories
      for (const memory of memorial.memories) {
        if (isR2ObjectKey(memory.mediaUrl)) {
          r2Keys.push(memory.mediaUrl);
          const thumbKey = getThumbKeyForObjectKey(memory.mediaUrl);
          if (thumbKey) r2Keys.push(thumbKey);
        }
      }
    }

    // Delete all R2 objects (best-effort; don't block account deletion on R2 errors)
    await Promise.allSettled(
      r2Keys.map((key) => deleteObject(key).catch(() => undefined))
    );

    // Cascade deletes + user deletion in transaction
    await prisma.$transaction(async (tx: { memorial: { findMany: (arg0: { where: { ownerId: string; }; select: { id: boolean; }; }) => any; deleteMany: (arg0: { where: { ownerId: string; }; }) => any; }; visitorInteraction: { deleteMany: (arg0: { where: { memorialId: { in: any; }; }; }) => any; }; memory: { deleteMany: (arg0: { where: { memorialId: { in: any; }; }; }) => any; }; memorialAccess: { deleteMany: (arg0: { where: { memorialId: { in: any; }; }; }) => any; }; lifeMoment: { deleteMany: (arg0: { where: { memorialId: { in: any; }; }; }) => any; }; user: { delete: (arg0: { where: { id: string; }; }) => any; }; }) => {
      const memorialIds = memorials.map((m: { id: any }) => m.id);

      await tx.visitorInteraction.deleteMany({
        where: { memorialId: { in: memorialIds } },
      });

      await tx.memory.deleteMany({
        where: { memorialId: { in: memorialIds } },
      });

      await tx.memorialAccess.deleteMany({
        where: { memorialId: { in: memorialIds } },
      });

      await tx.lifeMoment.deleteMany({
        where: { memorialId: { in: memorialIds } },
      });

      await tx.memorial.deleteMany({
        where: { ownerId: userId },
      });

      await tx.user.delete({
        where: { id: userId },
      });
    });

    clearSessionCookies(res);
    res.json({ message: 'Account and all data deleted' });
  } catch (err) {
    next(err);
  }
});
