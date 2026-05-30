import crypto from 'crypto';
import type { CookieOptions, Response } from 'express';

export interface AuthTokenPayload {
    tokenType: 'access';
    userId: string;
}

export interface RefreshTokenPayload {
    tokenType: 'refresh';
    userId: string;
}

export const AUTH_COOKIE_NAME = 'accessToken';
export const REFRESH_COOKIE_NAME = 'refreshToken';
export const CSRF_COOKIE_NAME = 'csrfToken';

type SameSiteValue = 'lax' | 'strict' | 'none';

export const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
export const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getCookieDomain(): string | undefined {
    const domain = process.env.AUTH_COOKIE_DOMAIN?.trim();
    return domain ? domain : undefined;
}

function getCookieSameSite(): SameSiteValue {
    const override = process.env.AUTH_COOKIE_SAME_SITE?.trim().toLowerCase();
    if (override === 'lax' || override === 'strict' || override === 'none') {
        return override;
    }

    return process.env.NODE_ENV === 'production' ? 'none' : 'lax';
}

function getCookieSecure(sameSite: SameSiteValue): boolean {
    const override = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();
    if (override === 'true') {
        return true;
    }

    if (override === 'false') {
        return false;
    }

    return process.env.NODE_ENV === 'production' || sameSite === 'none';
}

function getBaseCookieOptions(): Pick<
    CookieOptions,
    'domain' | 'path' | 'sameSite' | 'secure'
> {
    const sameSite = getCookieSameSite();
    const secure = getCookieSecure(sameSite);

    if (sameSite === 'none' && !secure) {
        throw new Error(
            'AUTH_COOKIE_SECURE must not be false when AUTH_COOKIE_SAME_SITE is set to none'
        );
    }

    return {
        domain: getCookieDomain(),
        path: '/',
        sameSite,
        secure,
    };
}

export function getAuthCookieOptions(): CookieOptions {
    return {
        ...getBaseCookieOptions(),
        httpOnly: true,
        maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    };
}

export function getAuthCookieClearOptions(): CookieOptions {
    return {
        ...getBaseCookieOptions(),
        httpOnly: true,
    };
}

export function getRefreshCookieOptions(): CookieOptions {
    return {
        ...getBaseCookieOptions(),
        httpOnly: true,
        maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    };
}

export function getRefreshCookieClearOptions(): CookieOptions {
    return {
        ...getBaseCookieOptions(),
        httpOnly: true,
    };
}

export function getCsrfCookieOptions(): CookieOptions {
    return {
        ...getBaseCookieOptions(),
        httpOnly: false,
        maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    };
}

export function getCsrfCookieClearOptions(): CookieOptions {
    return {
        ...getBaseCookieOptions(),
        httpOnly: false,
    };
}

export function setAuthCookie(res: Response, token: string): void {
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
}

export function clearAuthCookie(res: Response): void {
    res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieClearOptions());
}

export function setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE_NAME, token, getRefreshCookieOptions());
}

export function clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieClearOptions());
}

export function setCsrfCookie(res: Response, token: string): void {
    res.cookie(CSRF_COOKIE_NAME, token, getCsrfCookieOptions());
}

export function clearCsrfCookie(res: Response): void {
    res.clearCookie(CSRF_COOKIE_NAME, getCsrfCookieClearOptions());
}

export function ensureCsrfToken(existingToken?: string | null): string {
    if (typeof existingToken === 'string' && /^[a-f0-9]{64}$/i.test(existingToken)) {
        return existingToken;
    }

    return crypto.randomBytes(32).toString('hex');
}