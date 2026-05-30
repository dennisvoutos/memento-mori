import type { NextFunction, Request, Response } from 'express';
import { CSRF_COOKIE_NAME } from '../lib/auth-session.js';
import { AppError } from './error.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_HEADER_NAME = 'x-csrf-token';

export function csrfProtection(
    req: Request,
    _res: Response,
    next: NextFunction
): void {
    if (SAFE_METHODS.has(req.method.toUpperCase())) {
        next();
        return;
    }

    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
    const headerToken = req.get(CSRF_HEADER_NAME);

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        throw new AppError(403, 'CSRF validation failed');
    }

    next();
}