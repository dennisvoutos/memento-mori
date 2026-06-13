import type { Request, Response, NextFunction } from 'express';
import { AUTH_COOKIE_NAME } from '../lib/auth-session.js';
import { verifyAccessToken } from '../services/auth.service.js';
import { doesEmailRequireVerification } from '../services/email-verification-policy.js';
import { isTokenRevoked } from '../lib/token-denylist.js';
import { AppError } from './error.js';
import { prisma } from '../lib/prisma.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmailVerified?: boolean;
    }
  }
}

function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;
  return cookieToken ?? null;
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const token = extractToken(req);
  if (!token) {
    throw new AppError(401, 'Authentication required');
  }

  try {
    const payload = verifyAccessToken(token);
    if (isTokenRevoked(payload.jti)) {
      throw new AppError(401, 'Token has been revoked');
    }
    req.userId = payload.userId;
    next();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(401, 'Invalid or expired token');
  }
}

export async function requireVerifiedUser(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    throw new AppError(401, 'Authentication required');
  }

  try {
    const payload = verifyAccessToken(token);
    if (isTokenRevoked(payload.jti)) {
      throw new AppError(401, 'Token has been revoked');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new AppError(401, 'Invalid or expired token');
    }

    const effectiveUser =
      !user.emailVerified && !doesEmailRequireVerification(user.email)
        ? await prisma.user.update({
          where: { id: user.id },
          data: {
            emailVerified: true,
            verificationTokenHash: null,
            verificationExpires: null,
          },
        })
        : user;

    if (!effectiveUser.emailVerified) {
      throw new AppError(403, 'Please verify your email before continuing');
    }

    req.userId = effectiveUser.id;
    req.userEmailVerified = effectiveUser.emailVerified;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(401, 'Invalid or expired token');
  }
}

export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    if (isTokenRevoked(payload.jti)) {
      // Token is revoked — proceed unauthenticated
      next();
      return;
    }
    req.userId = payload.userId;
  } catch {
    // Invalid token is fine for optional auth — just proceed unauthenticated
  }

  next();
}
