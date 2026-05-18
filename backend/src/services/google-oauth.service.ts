import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { AppError } from '../middleware/error.js';

const GOOGLE_OAUTH_SCOPES = ['openid', 'email', 'profile'];
const GOOGLE_STATE_SECRET = process.env.JWT_SECRET || 'dev-secret';
const DEFAULT_FRONTEND_APP_URL = 'http://localhost:5173';

export type GoogleEntryPath = '/login' | '/register';

export interface GoogleOAuthState {
    kind: 'google-oauth-state';
    entryPath: GoogleEntryPath;
    redirectTo: string;
}

export interface GoogleProfile {
    sub: string;
    email: string;
    emailVerified: boolean;
    name: string;
    picture: string | null;
}

function getGoogleClientId() {
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
        throw new AppError(503, 'Google sign-in is not configured on the server');
    }

    return clientId;
}

function getGoogleOAuthConfig() {
    const clientId = getGoogleClientId();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri =
        process.env.GOOGLE_REDIRECT_URI ||
        'http://localhost:3001/api/auth/google/callback';

    if (!clientSecret) {
        throw new AppError(503, 'Google sign-in is not configured on the server');
    }

    return {
        clientId,
        clientSecret,
        redirectUri,
    };
}

function getGoogleClient(): OAuth2Client {
    const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
    return new OAuth2Client({
        clientId,
        clientSecret,
        redirectUri,
    });
}

function toGoogleVerificationError(error: unknown): AppError {
    if (error instanceof AppError) {
        return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error('Google token verification failed:', message);

    return new AppError(
        401,
        'Google sign-in could not be verified. Please try again.'
    );
}

function toGoogleExchangeError(error: unknown): AppError {
    if (error instanceof AppError) {
        return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error('Google OAuth code exchange failed:', message);

    return new AppError(
        502,
        'Google sign-in failed while contacting Google. Please try again.'
    );
}

function mapGooglePayloadToProfile(payload: {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string | null;
    picture?: string | null;
} | null | undefined): GoogleProfile {
    if (!payload?.sub || !payload.email) {
        throw new AppError(502, 'Google sign-in failed');
    }

    return {
        sub: payload.sub,
        email: payload.email,
        emailVerified: Boolean(payload.email_verified),
        name: payload.name ?? '',
        picture: payload.picture ?? null,
    };
}

function getFrontendAppUrl(): URL {
    const configuredUrl = process.env.FRONTEND_APP_URL?.trim();

    try {
        return new URL(configuredUrl || DEFAULT_FRONTEND_APP_URL);
    } catch {
        throw new AppError(500, 'FRONTEND_APP_URL is invalid');
    }
}

export function sanitizeGoogleEntryPath(value: unknown): GoogleEntryPath {
    return value === '/register' ? '/register' : '/login';
}

export function getPublicGoogleClientConfig() {
    return {
        clientId: getGoogleClientId(),
    };
}

export function sanitizeGoogleRedirectPath(value: unknown): string {
    if (typeof value !== 'string') {
        return '/dashboard';
    }

    const trimmedValue = value.trim();
    if (!trimmedValue.startsWith('/') || trimmedValue.startsWith('//')) {
        return '/dashboard';
    }

    try {
        const parsed = new URL(trimmedValue, 'http://localhost');
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
        return '/dashboard';
    }
}

function encodeState(state: GoogleOAuthState): string {
    return jwt.sign(state, GOOGLE_STATE_SECRET, { expiresIn: '10m' });
}

function joinAppPath(baseUrl: URL, appPath: string): string {
    const resolvedPath = new URL(appPath, 'http://localhost');
    const target = new URL(baseUrl.toString());
    const basePath = target.pathname.replace(/\/$/, '');

    target.pathname = `${basePath}${resolvedPath.pathname}`.replace(/\/+/g, '/');
    target.search = resolvedPath.search;
    target.hash = resolvedPath.hash;

    return target.toString();
}

export function getGoogleAuthorizationUrl(args: {
    entryPath: GoogleEntryPath;
    redirectTo: string;
}): string {
    const client = getGoogleClient();
    const entryPath = sanitizeGoogleEntryPath(args.entryPath);
    const redirectTo = sanitizeGoogleRedirectPath(args.redirectTo);

    return client.generateAuthUrl({
        access_type: 'offline',
        include_granted_scopes: true,
        prompt: 'select_account',
        scope: GOOGLE_OAUTH_SCOPES,
        state: encodeState({
            kind: 'google-oauth-state',
            entryPath,
            redirectTo,
        }),
    });
}

export function parseGoogleOAuthState(state: string): GoogleOAuthState {
    try {
        const payload = jwt.verify(state, GOOGLE_STATE_SECRET) as Partial<GoogleOAuthState>;

        if (payload.kind !== 'google-oauth-state') {
            throw new Error('Invalid state payload');
        }

        return {
            kind: 'google-oauth-state',
            entryPath: sanitizeGoogleEntryPath(payload.entryPath),
            redirectTo: sanitizeGoogleRedirectPath(payload.redirectTo),
        };
    } catch {
        throw new AppError(400, 'Google sign-in request is invalid or has expired');
    }
}

export async function exchangeGoogleCodeForProfile(code: string): Promise<GoogleProfile> {
    try {
        const client = getGoogleClient();
        const { clientId } = getGoogleOAuthConfig();
        const { tokens } = await client.getToken(code);

        if (!tokens.id_token) {
            throw new AppError(502, 'Google sign-in failed');
        }

        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: clientId,
        });

        return mapGooglePayloadToProfile(ticket.getPayload());
    } catch (error) {
        throw toGoogleExchangeError(error);
    }
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
    try {
        const clientId = getGoogleClientId();
        const client = new OAuth2Client(clientId);
        const ticket = await client.verifyIdToken({
            idToken,
            audience: clientId,
        });

        return mapGooglePayloadToProfile(ticket.getPayload());
    } catch (error) {
        throw toGoogleVerificationError(error);
    }
}

export function buildGoogleSuccessRedirectUrl(redirectTo: string): string {
    return joinAppPath(getFrontendAppUrl(), sanitizeGoogleRedirectPath(redirectTo));
}

export function buildGoogleErrorRedirectUrl(args: {
    entryPath: GoogleEntryPath;
    redirectTo: string;
    errorCode: string;
}): string {
    const path = sanitizeGoogleEntryPath(args.entryPath);
    const url = new URL(joinAppPath(getFrontendAppUrl(), path));

    url.searchParams.set('authError', args.errorCode);
    url.searchParams.set('redirectTo', sanitizeGoogleRedirectPath(args.redirectTo));

    return url.toString();
}

export function mapGoogleAuthErrorCode(error: unknown): string {
    if (error instanceof AppError) {
        switch (error.message) {
            case 'Google sign-in is not configured on the server':
                return 'google_configuration_invalid';
            case 'Google sign-in request is invalid or has expired':
                return 'google_state_invalid';
            case 'Your Google account email must be verified before you can continue':
                return 'google_email_unverified';
            case 'This email is already linked to a different Google account':
                return 'google_account_conflict';
            default:
                return 'google_sign_in_failed';
        }
    }

    return 'google_sign_in_failed';
}