import type { Request, Response, NextFunction } from 'express';
import { AUTH_COOKIE_NAME } from '../lib/auth-session.js';
import { verifyAccessToken } from '../services/auth.service.js';
import { AppError } from './error.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
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
    req.userId = payload.userId;
    next();
  } catch {
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
    req.userId = payload.userId;
  } catch {
    // Invalid token is fine for optional auth — just proceed unauthenticated
  }

  next();
}
