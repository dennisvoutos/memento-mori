import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './error.js';

export interface AuthPayload {
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

function extractToken(req: Request): string | null {
  // 1. HTTP-only cookie
  const cookieToken = req.cookies?.token as string | undefined;
  if (cookieToken) return cookieToken;

  // 2. Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
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
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || 'dev-secret'
    ) as AuthPayload;
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
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || 'dev-secret'
    ) as AuthPayload;
    req.userId = payload.userId;
  } catch {
    // Invalid token is fine for optional auth — just proceed unauthenticated
  }

  next();
}
