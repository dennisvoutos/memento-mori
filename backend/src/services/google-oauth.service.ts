import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { AppError } from '../middleware/error.js';

const GOOGLE_OAUTH_SCOPES = ['openid', 'email', 'profile'];
const GOOGLE_PHOTOS_DEFAULT_SCOPES = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/photoslibrary.readonly',
    'https://www.googleapis.com/auth/photoslibrary.readonly.originals',
    'https://www.googleapis.com/auth/photospicker.mediaitems.readonly',
];
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
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

export function getFrontendAppUrl(): URL {
    const configuredUrl = process.env.FRONTEND_APP_URL?.trim();

    try {
        return new URL(configuredUrl || DEFAULT_FRONTEND_APP_URL);
    } catch {
        throw new AppError(500, 'FRONTEND_APP_URL is invalid');
    }
}

export function joinAppPath(baseUrl: URL, appPath: string): string {
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

// ── Google Photos incremental auth ──

export interface GooglePhotosOAuthState {
    kind: 'google-photos-oauth-state';
    userId: string;
    returnTo: string;
}

/**
 * Returns the scopes to request for Google Photos access.
 * Reads GOOGLE_PHOTOS_SCOPES from env (space-separated) or falls back to defaults.
 */
export function getGooglePhotosScopes(): string[] {
    const envScopes = process.env.GOOGLE_PHOTOS_SCOPES?.trim();
    if (envScopes) {
        return envScopes.split(/\s+/).filter(Boolean);
    }
    return GOOGLE_PHOTOS_DEFAULT_SCOPES;
}

/**
 * Returns the redirect URI that Google will call back after the user
 * consents to the Photos scopes. This must match what's registered in
 * the Google Cloud Console under Authorized redirect URIs.
 */
export function getGooglePhotosRedirectUri(): string {
    return (
        process.env.GOOGLE_PHOTOS_REDIRECT_URI?.trim() ||
        process.env.GOOGLE_REDIRECT_URI?.trim() ||
        'http://localhost:3001/api/auth/google/photos/callback'
    );
}

/**
 * Builds the Google OAuth 2.0 authorization URL for the Photos incremental
 * auth flow. Uses response_type=code and access_type=offline so we get a
 * refresh token for long-lived access.
 *
 * Format per Google's spec:
 *   https://accounts.google.com/o/oauth2/v2/auth?
 *     scope=<space-separated scopes>&
 *     access_type=offline&
 *     include_granted_scopes=true&
 *     response_type=code&
 *     state=<jwt>&
 *     redirect_uri=<callback>&
 *     client_id=<client_id>
 */
export function getGooglePhotosAuthUrl(args: {
    userId: string;
    returnTo: string;
}): string {
    const clientId = getGoogleClientId();
    const redirectUri = getGooglePhotosRedirectUri();
    const scopes = getGooglePhotosScopes();

    const state = jwt.sign(
        {
            kind: 'google-photos-oauth-state',
            userId: args.userId,
            returnTo: sanitizeGoogleRedirectPath(args.returnTo),
        } satisfies GooglePhotosOAuthState,
        GOOGLE_STATE_SECRET,
        { expiresIn: '10m' }
    );

    const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        access_type: 'offline',
        include_granted_scopes: 'true',
        redirect_uri: redirectUri,
        state,
        scope: scopes.join(' '),
        prompt: 'consent', // force consent to ensure we get a refresh token
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export function parseGooglePhotosOAuthState(rawState: string): GooglePhotosOAuthState {
    try {
        const payload = jwt.verify(rawState, GOOGLE_STATE_SECRET) as Partial<GooglePhotosOAuthState>;

        if (payload.kind !== 'google-photos-oauth-state' || !payload.userId) {
            throw new Error('Invalid state payload');
        }

        return {
            kind: 'google-photos-oauth-state',
            userId: payload.userId,
            returnTo: sanitizeGoogleRedirectPath(payload.returnTo),
        };
    } catch {
        throw new AppError(400, 'Google Photos authorization request is invalid or has expired');
    }
}