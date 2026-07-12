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
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import {
  registerUser,
  loginUser,
  loginOrRegisterWithGoogle,
  loginOrRegisterWithApple,
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
  getFrontendAppUrl,
  getPublicGoogleClientConfig,
  getGoogleAuthorizationUrl,
  getGooglePhotosAuthUrl,
  getGooglePhotosRedirectUri,
  getGooglePhotosScopes,
  joinAppPath,
  parseGooglePhotosOAuthState,
  mapGoogleAuthErrorCode,
  parseGoogleOAuthState,
  sanitizeGoogleEntryPath,
  sanitizeGoogleRedirectPath,
  type GoogleEntryPath,
  verifyGoogleIdToken,
} from '../services/google-oauth.service.js';
import {
  buildAppleErrorRedirectUrl,
  buildAppleSuccessRedirectUrl,
  exchangeAppleCodeForProfile,
  getPublicAppleConfig,
  getAppleAuthorizationUrl,
  mapAppleAuthErrorCode,
  parseAppleOAuthState,
  sanitizeRedirectPath,
} from '../services/apple-auth.service.js';

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

const signupLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3,
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    message:
      'Too many accounts created from this IP address. Please try again in 24 hours.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const email = req.body?.email || 'unknown';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `login:${ip}:${email}`;
  },
  message: { message: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
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

// ── Apple Sign-In ──

// GET /api/auth/apple/config
authRouter.get('/apple/config', (_req, res, next) => {
  try {
    res.json(getPublicAppleConfig());
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/apple
authRouter.get('/apple', (req, res) => {
  const redirectTo = sanitizeRedirectPath(req.query.redirectTo);

  try {
    res.redirect(
      getAppleAuthorizationUrl({ redirectTo })
    );
  } catch (error) {
    res.redirect(
      buildAppleErrorRedirectUrl({
        redirectTo,
        errorCode: mapAppleAuthErrorCode(error),
      })
    );
  }
});

// POST /api/auth/apple/callback
authRouter.post('/apple/callback', async (req, res) => {
  const rawState = typeof req.body.state === 'string' ? req.body.state : '';

  let state = {
    redirectTo: '/dashboard' as string,
  };

  try {
    if (rawState) {
      state = parseAppleOAuthState(rawState);
    }

    if (req.body.error) {
      res.redirect(
        buildAppleErrorRedirectUrl({
          redirectTo: state.redirectTo,
          errorCode: 'access_denied',
        })
      );
      return;
    }

    const code = typeof req.body.code === 'string' ? req.body.code : '';
    if (!code) {
      throw new AppError(400, 'Apple sign-in failed');
    }

    const profile = await exchangeAppleCodeForProfile(code);
    const { accessToken, refreshToken } =
      await loginOrRegisterWithApple(profile, getRequestSessionContext(req));

    setSessionCookies(res, accessToken, refreshToken);
    res.redirect(buildAppleSuccessRedirectUrl(state.redirectTo));
  } catch (error) {
    res.redirect(
      buildAppleErrorRedirectUrl({
        redirectTo: state.redirectTo,
        errorCode: mapAppleAuthErrorCode(error),
      })
    );
  }
});

// ── Linked Accounts ──

interface LinkedAccountResponse {
  provider: string;
  email: string | null;
  linkedAt: string | null;
}

// GET /api/auth/linked-accounts
authRouter.get('/linked-accounts', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        googleId: true,
        googleLinkedAt: true,
        googleEmailVerified: true,
        appleId: true,
        appleLinkedAt: true,
        appleEmailVerified: true,
        email: true,
        connectedServices: {
          select: { id: true, provider: true, scopes: true, linkedAt: true, expiresAt: true },
        },
      },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const accounts: LinkedAccountResponse[] = [];

    if (user.googleId) {
      accounts.push({
        provider: 'GOOGLE',
        email: user.email,
        linkedAt: user.googleLinkedAt?.toISOString() ?? null,
      });
    }

    if (user.appleId) {
      accounts.push({
        provider: 'APPLE',
        email: user.email,
        linkedAt: user.appleLinkedAt?.toISOString() ?? null,
      });
    }

    const services = user.connectedServices.map((cs) => ({
      id: cs.id,
      provider: cs.provider,
      scopes: cs.scopes,
      linkedAt: cs.linkedAt.toISOString(),
      expiresAt: cs.expiresAt?.toISOString() ?? null,
    }));

    res.json({ accounts, services });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/link/google
authRouter.post('/link/google', requireAuth, async (req, res, next) => {
  try {
    const { credential } = z.object({
      credential: z.string().min(1, 'Google credential is required'),
    }).parse(req.body);

    const profile = await verifyGoogleIdToken(credential);
    const existingUser = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { email: true, googleId: true },
    });

    if (!existingUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (existingUser.googleId) {
      res.status(409).json({ message: 'Google is already linked to this account' });
      return;
    }

    // Check if this Google ID is already linked to another account
    const conflictingUser = await prisma.user.findUnique({
      where: { googleId: profile.sub },
    });

    if (conflictingUser && conflictingUser.id !== req.userId!) {
      res.status(409).json({ message: 'This Google account is already linked to a different Memento Mori account' });
      return;
    }

    await prisma.user.update({
      where: { id: req.userId! },
      data: {
        googleId: profile.sub,
        googleEmailVerified: profile.emailVerified,
        googleLinkedAt: new Date(),
        emailVerified: true,
      },
    });

    const user = await getUserById(req.userId!);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/link/apple
authRouter.post('/link/apple', requireAuth, async (req, res, next) => {
  try {
    const { code } = z.object({
      code: z.string().min(1, 'Apple authorization code is required'),
    }).parse(req.body);

    const profile = await exchangeAppleCodeForProfile(code);
    const existingUser = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { email: true, appleId: true },
    });

    if (!existingUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (existingUser.appleId) {
      res.status(409).json({ message: 'Apple is already linked to this account' });
      return;
    }

    // Check if this Apple ID is already linked to another account
    const conflictingUser = await prisma.user.findUnique({
      where: { appleId: profile.sub },
    });

    if (conflictingUser && conflictingUser.id !== req.userId!) {
      res.status(409).json({ message: 'This Apple account is already linked to a different Memento Mori account' });
      return;
    }

    await prisma.user.update({
      where: { id: req.userId! },
      data: {
        appleId: profile.sub,
        appleEmailVerified: profile.emailVerified,
        appleLinkedAt: new Date(),
      },
    });

    const user = await getUserById(req.userId!);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/link/:provider
authRouter.delete('/link/:provider', requireAuth, async (req, res, next) => {
  try {
    const { provider } = req.params;
    const allowedProviders = ['GOOGLE', 'APPLE'];

    if (!allowedProviders.includes(provider)) {
      res.status(400).json({ message: 'Invalid provider' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        passwordHash: true,
        googleId: true,
        appleId: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check that the user has at least one other sign-in method
    const hasPassword = Boolean(user.passwordHash);
    const hasGoogle = Boolean(user.googleId);
    const hasApple = Boolean(user.appleId);

    if (provider === 'GOOGLE' && !hasPassword && !hasApple) {
      res.status(400).json({
        message: 'You must have at least one sign-in method. Add a password or link Apple before disconnecting Google.',
      });
      return;
    }

    if (provider === 'APPLE' && !hasPassword && !hasGoogle) {
      res.status(400).json({
        message: 'You must have at least one sign-in method. Add a password or link Google before disconnecting Apple.',
      });
      return;
    }

    if (provider === 'GOOGLE') {
      // Also revoke Google Photos if linked
      await prisma.connectedService.deleteMany({
        where: { userId: req.userId!, provider: 'GOOGLE_PHOTOS' },
      });

      await prisma.user.update({
        where: { id: req.userId! },
        data: {
          googleId: null,
          googleEmailVerified: false,
          googleLinkedAt: null,
        },
      });
    }

    if (provider === 'APPLE') {
      // Also revoke iCloud Photos if linked
      await prisma.connectedService.deleteMany({
        where: { userId: req.userId!, provider: 'ICLOUD_PHOTOS' },
      });

      await prisma.user.update({
        where: { id: req.userId! },
        data: {
          appleId: null,
          appleEmailVerified: false,
          appleLinkedAt: null,
        },
      });
    }

    const updatedUser = await getUserById(req.userId!);
    res.json({ user: updatedUser });
  } catch (err) {
    next(err);
  }
});

// ── Google Photos Integration ──

const ENCRYPTION_KEY = (() => {
  const key = process.env.JWT_SECRET || 'dev-secret';
  // Derive a 32-byte key using SHA-256
  return crypto.createHash('sha256').update('google-photos-encryption:' + key).digest();
})();

const ENCRYPTION_IV_LENGTH = 16;
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

function encryptToken(token: string): string {
  const iv = crypto.randomBytes(ENCRYPTION_IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptToken(encrypted: string): string {
  const [ivHex, encryptedHex] = encrypted.split(':');
  if (!ivHex || !encryptedHex) {
    throw new Error('Invalid encrypted token format');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedBuffer = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  return decrypted.toString('utf8');
}

// GET /api/auth/google/photos/config
authRouter.get('/google/photos/config', requireAuth, async (req, res, next) => {
  try {
    const service = await prisma.connectedService.findUnique({
      where: {
        userId_provider: {
          userId: req.userId!,
          provider: 'GOOGLE_PHOTOS',
        },
      },
      select: { scopes: true, linkedAt: true, expiresAt: true, refreshToken: true },
    });

    res.json({
      isAuthorized: Boolean(service),
      scopes: service?.scopes ?? null,
      linkedAt: service?.linkedAt?.toISOString() ?? null,
      expiresAt: service?.expiresAt?.toISOString() ?? null,
      hasRefreshToken: Boolean(service?.refreshToken),
      requestedScopes: getGooglePhotosScopes(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/google/photos/auth-url
// Returns the Google OAuth 2.0 authorization URL for the Photos incremental flow.
// The frontend redirects the browser to this URL.
authRouter.get('/google/photos/auth-url', requireAuth, (req, res, next) => {
  try {
    const returnTo = sanitizeRedirectPath(
      typeof req.query.returnTo === 'string' ? req.query.returnTo : undefined
    );

    const url = getGooglePhotosAuthUrl({
      userId: req.userId!,
      returnTo,
    });

    res.json({ url });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/google/photos/callback
// Handles the redirect from Google after the user consents to the Photos scopes.
// Exchanges the authorization code for tokens and stores them encrypted.
// Then redirects back to the frontend.
authRouter.get('/google/photos/callback', async (req, res) => {
  const rawState = typeof req.query.state === 'string' ? req.query.state : '';
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const error = typeof req.query.error === 'string' ? req.query.error : undefined;

  let returnTo = '/dashboard';
  let userId: string | null = null;

  // Parse state regardless of outcome so we know where to redirect
  try {
    if (rawState) {
      const parsed = parseGooglePhotosOAuthState(rawState);
      returnTo = parsed.returnTo;
      userId = parsed.userId;
    }
  } catch {
    // State parse failed — redirect to dashboard with error
    res.redirect(buildGoogleErrorRedirectUrl({
      entryPath: '/login',
      redirectTo: '/dashboard',
      errorCode: 'google_photos_state_invalid',
    }));
    return;
  }

  // Google reported an error (user denied consent, etc.)
  if (error) {
    const frontendUrl = new URL(
      joinAppPath(getFrontendAppUrl(), returnTo)
    );
    frontendUrl.searchParams.set('photosError', error);
    res.redirect(frontendUrl.toString());
    return;
  }

  if (!code) {
    res.redirect(buildGoogleErrorRedirectUrl({
      entryPath: '/login',
      redirectTo: returnTo,
      errorCode: 'google_photos_no_code',
    }));
    return;
  }

  // Exchange the authorization code for tokens
  try {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!googleClientId || !googleClientSecret) {
      throw new Error('Google Photos is not configured');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: getGooglePhotosRedirectUri(),
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text().catch(() => 'Unknown error');
      console.error('Google Photos token exchange failed:', errorText);
      throw new Error('Token exchange failed');
    }

    const tokens = await tokenResponse.json() as {
      access_token?: string;
      refresh_token?: string;
      scope?: string;
      expires_in?: number;
    };

    if (!tokens.access_token) {
      throw new Error('No access token received');
    }

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    // Store encrypted tokens
    await prisma.connectedService.upsert({
      where: {
        userId_provider: {
          userId: userId!,
          provider: 'GOOGLE_PHOTOS',
        },
      },
      create: {
        userId: userId!,
        provider: 'GOOGLE_PHOTOS',
        accessToken: encryptToken(tokens.access_token),
        refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
        scopes: tokens.scope ?? null,
        expiresAt,
      },
      update: {
        accessToken: encryptToken(tokens.access_token),
        refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined,
        scopes: tokens.scope ?? undefined,
        expiresAt,
      },
    });

    // Redirect back to the frontend with success
    const frontendUrl = new URL(
      joinAppPath(getFrontendAppUrl(), returnTo)
    );
    frontendUrl.searchParams.set('photosConnected', 'true');
    res.redirect(frontendUrl.toString());
  } catch (err) {
    console.error('Google Photos callback error:', err);
    const frontendUrl = new URL(
      joinAppPath(getFrontendAppUrl(), returnTo)
    );
    frontendUrl.searchParams.set('photosError', 'token_exchange_failed');
    res.redirect(frontendUrl.toString());
  }
});

// POST /api/auth/google/photos/token
// Used by the frontend to exchange an authorization code obtained via
// the popup-based incremental auth flow (alternative to the redirect flow).
authRouter.post('/google/photos/token', requireAuth, async (req, res, next) => {
  try {
    const { code, redirectUri } = z.object({
      code: z.string().min(1, 'Authorization code is required'),
      redirectUri: z.string().min(1, 'Redirect URI is required'),
    }).parse(req.body);

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!googleClientId || !googleClientSecret) {
      res.status(503).json({ message: 'Google Photos integration is not configured' });
      return;
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text().catch(() => 'Unknown error');
      console.error('Google Photos token exchange failed:', errorText);
      res.status(502).json({ message: 'Failed to exchange authorization code with Google' });
      return;
    }

    const tokens = await tokenResponse.json() as {
      access_token?: string;
      refresh_token?: string;
      scope?: string;
      expires_in?: number;
    };

    if (!tokens.access_token) {
      res.status(502).json({ message: 'Failed to get access token from Google' });
      return;
    }

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    await prisma.connectedService.upsert({
      where: {
        userId_provider: {
          userId: req.userId!,
          provider: 'GOOGLE_PHOTOS',
        },
      },
      create: {
        userId: req.userId!,
        provider: 'GOOGLE_PHOTOS',
        accessToken: encryptToken(tokens.access_token),
        refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
        scopes: tokens.scope ?? null,
        expiresAt,
      },
      update: {
        accessToken: encryptToken(tokens.access_token),
        refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined,
        scopes: tokens.scope ?? undefined,
        expiresAt,
      },
    });

    res.json({
      message: 'Google Photos connected successfully',
      expiresAt: expiresAt?.toISOString() ?? null,
      scopes: tokens.scope ?? null,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/google/photos/access-token
authRouter.get('/google/photos/access-token', requireAuth, async (req, res, next) => {
  try {
    const service = await prisma.connectedService.findUnique({
      where: {
        userId_provider: {
          userId: req.userId!,
          provider: 'GOOGLE_PHOTOS',
        },
      },
    });

    if (!service) {
      res.status(404).json({ message: 'Google Photos is not connected' });
      return;
    }

    // Check if token is expired and needs refresh
    if (service.expiresAt && service.expiresAt <= new Date()) {
      if (!service.refreshToken) {
        res.status(401).json({ message: 'Google Photos access token has expired and no refresh token is available. Please re-authorize.' });
        return;
      }

      const googleClientId = process.env.GOOGLE_CLIENT_ID;
      const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (!googleClientId || !googleClientSecret) {
        res.status(503).json({ message: 'Google Photos integration is not configured' });
        return;
      }

      try {
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: googleClientId,
            client_secret: googleClientSecret,
            refresh_token: decryptToken(service.refreshToken),
            grant_type: 'refresh_token',
          }).toString(),
        });

        if (!refreshResponse.ok) {
          // Refresh failed — delete the service so user re-authorizes
          await prisma.connectedService.delete({
            where: { id: service.id },
          });
          res.status(401).json({ message: 'Google Photos authorization has expired. Please re-authorize.' });
          return;
        }

        const refreshedTokens = await refreshResponse.json() as {
          access_token?: string;
          expires_in?: number;
          scope?: string;
        };

        if (!refreshedTokens.access_token) {
          res.status(502).json({ message: 'Failed to refresh Google Photos access token' });
          return;
        }

        const newExpiresAt = refreshedTokens.expires_in
          ? new Date(Date.now() + refreshedTokens.expires_in * 1000)
          : null;

        await prisma.connectedService.update({
          where: { id: service.id },
          data: {
            accessToken: encryptToken(refreshedTokens.access_token),
            expiresAt: newExpiresAt,
            scopes: refreshedTokens.scope ?? service.scopes,
          },
        });

        res.json({
          accessToken: refreshedTokens.access_token,
          expiresAt: newExpiresAt?.toISOString() ?? null,
        });
        return;
      } catch (error) {
        console.error('Failed to refresh Google Photos token:', error);
        res.status(502).json({ message: 'Failed to refresh Google Photos access token' });
        return;
      }
    }

    // Token is still valid
    res.json({
      accessToken: decryptToken(service.accessToken),
      expiresAt: service.expiresAt?.toISOString() ?? null,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/google/photos
authRouter.delete('/google/photos', requireAuth, async (req, res, next) => {
  try {
    const service = await prisma.connectedService.findUnique({
      where: {
        userId_provider: {
          userId: req.userId!,
          provider: 'GOOGLE_PHOTOS',
        },
      },
    });

    if (!service) {
      res.status(404).json({ message: 'Google Photos is not connected' });
      return;
    }

    // Revoke the token with Google (best-effort)
    try {
      const token = decryptToken(service.accessToken);
      await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token }).toString(),
      });
    } catch {
      // Best-effort revocation — proceed with DB cleanup
    }

    await prisma.connectedService.delete({
      where: { id: service.id },
    });

    res.json({ message: 'Google Photos disconnected' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register
authRouter.post('/register', signupLimiter, async (req, res, next) => {
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
authRouter.post('/login', loginLimiter, async (req, res, next) => {
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
    const { passwordHash, resetPasswordToken, resetPasswordExpires, verificationTokenHash, verificationExpires, googleId, passwordChangedAt, ...exported } = user;

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
