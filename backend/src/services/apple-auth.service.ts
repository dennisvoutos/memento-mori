import jwt from 'jsonwebtoken';
import { AppError } from '../middleware/error.js';

const APPLE_OAUTH_SCOPES = ['name', 'email'];
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_AUTH_URL = 'https://appleid.apple.com/auth/authorize';
const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_ISSUER = 'https://appleid.apple.com';
const DEFAULT_FRONTEND_APP_URL = 'http://localhost:5173';

export interface AppleProfile {
    sub: string;
    email: string;
    emailVerified: boolean;
    name: string;
}

export interface AppleOAuthState {
    kind: 'apple-oauth-state';
    redirectTo: string;
}

interface AppleJwkKey {
    kty: string;
    kid: string;
    use: string;
    alg: string;
    n: string;
    e: string;
}

interface AppleJwksResponse {
    keys: AppleJwkKey[];
}

function getAppleConfig() {
    const clientId = process.env.APPLE_CLIENT_ID?.trim();
    const teamId = process.env.APPLE_TEAM_ID?.trim();
    const keyId = process.env.APPLE_KEY_ID?.trim();
    const privateKey = process.env.APPLE_PRIVATE_KEY?.trim();
    const redirectUri = process.env.APPLE_REDIRECT_URI?.trim();

    if (!clientId || !teamId || !keyId || !privateKey) {
        throw new AppError(503, 'Apple sign-in is not configured on the server');
    }

    // Normalize PEM key
    const normalizedKey = privateKey.replace(/\\n/g, '\n');

    return {
        clientId,
        teamId,
        keyId,
        privateKey: normalizedKey,
        redirectUri: redirectUri || 'http://localhost:3001/api/auth/apple/callback',
    };
}

function generateAppleClientSecret(): string {
    const { clientId, teamId, keyId, privateKey } = getAppleConfig();

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 180 * 24 * 60 * 60; // 180 days (Apple max)

    return jwt.sign({}, privateKey, {
        algorithm: 'ES256',
        issuer: teamId,
        keyid: keyId,
        subject: clientId,
        audience: APPLE_TOKEN_URL,
        expiresIn: 180 * 24 * 60 * 60,
        header: {
            alg: 'ES256',
            kid: keyId,
        },
    });
}

async function fetchAppleJwks(): Promise<AppleJwksResponse> {
    const response = await fetch(APPLE_JWKS_URL);
    if (!response.ok) {
        throw new AppError(502, 'Unable to verify Apple identity at this time');
    }
    return response.json();
}

function getFrontendAppUrl(): URL {
    const configuredUrl = process.env.FRONTEND_APP_URL?.trim();

    try {
        return new URL(configuredUrl || DEFAULT_FRONTEND_APP_URL);
    } catch {
        throw new AppError(500, 'FRONTEND_APP_URL is invalid');
    }
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

export function sanitizeRedirectPath(value: unknown): string {
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

function encodeState(state: AppleOAuthState): string {
    const secret = process.env.JWT_SECRET || 'dev-secret';
    return jwt.sign(state, secret, { expiresIn: '10m' });
}

export function parseAppleOAuthState(rawState: string): AppleOAuthState {
    const secret = process.env.JWT_SECRET || 'dev-secret';

    try {
        const payload = jwt.verify(rawState, secret) as Partial<AppleOAuthState>;

        if (payload.kind !== 'apple-oauth-state') {
            throw new Error('Invalid state payload');
        }

        return {
            kind: 'apple-oauth-state',
            redirectTo: sanitizeRedirectPath(payload.redirectTo),
        };
    } catch {
        throw new AppError(400, 'Apple sign-in request is invalid or has expired');
    }
}

export function getPublicAppleConfig() {
    const { clientId, redirectUri } = getAppleConfig();
    return { clientId, redirectUri };
}

export function getAppleAuthorizationUrl(args: { redirectTo: string }): string {
    const { clientId, redirectUri } = getAppleConfig();
    const redirectTo = sanitizeRedirectPath(args.redirectTo);

    const state = encodeState({
        kind: 'apple-oauth-state',
        redirectTo,
    });

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        response_mode: 'form_post',
        scope: APPLE_OAUTH_SCOPES.join(' '),
    });

    return `${APPLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeAppleCodeForProfile(code: string): Promise<AppleProfile> {
    const { clientId, redirectUri } = getAppleConfig();

    try {
        const clientSecret = generateAppleClientSecret();

        const body = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
        });

        const tokenResponse = await fetch(APPLE_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text().catch(() => 'Unknown error');
            console.error('Apple token exchange failed:', errorText);
            throw new AppError(502, 'Apple sign-in failed while contacting Apple. Please try again.');
        }

        const tokens = await tokenResponse.json() as {
            access_token?: string;
            id_token?: string;
            refresh_token?: string;
        };

        if (!tokens.id_token) {
            throw new AppError(502, 'Apple sign-in failed');
        }

        return verifyAppleIdToken(tokens.id_token);
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        const message = error instanceof Error ? error.message : String(error);
        console.error('Apple code exchange failed:', message);
        throw new AppError(502, 'Apple sign-in failed while contacting Apple. Please try again.');
    }
}

export async function verifyAppleIdToken(idToken: string): Promise<AppleProfile> {
    const { clientId } = getAppleConfig();

    try {
        // Decode header to get kid
        const decoded = jwt.decode(idToken, { complete: true });
        if (!decoded || typeof decoded === 'string') {
            throw new AppError(502, 'Apple sign-in failed');
        }

        const kid = decoded.header?.kid;
        if (!kid) {
            throw new AppError(502, 'Apple sign-in failed');
        }

        // Fetch JWKS and find matching key
        const jwks = await fetchAppleJwks();
        const jwk = jwks.keys.find((k) => k.kid === kid);
        if (!jwk) {
            throw new AppError(502, 'Apple sign-in failed');
        }

        // Convert JWK to PEM
        const crypto = await import('crypto');
        const publicKey = crypto.createPublicKey({
            key: {
                kty: jwk.kty,
                n: jwk.n,
                e: jwk.e,
            },
            format: 'jwk',
        });

        const pemKey = publicKey.export({ type: 'spki', format: 'pem' }) as string;

        const verifyOpts: jwt.VerifyOptions = {
            algorithms: ['RS256'],
            issuer: APPLE_ISSUER,
            audience: clientId,
        };

        const payload = jwt.verify(idToken, pemKey, verifyOpts) as Record<string, unknown>;

        return mapApplePayloadToProfile(payload);
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        const message = error instanceof Error ? error.message : String(error);
        console.error('Apple ID token verification failed:', message);
        throw new AppError(401, 'Apple sign-in could not be verified. Please try again.');
    }
}

function mapApplePayloadToProfile(payload: Record<string, unknown>): AppleProfile {
    const sub = typeof payload.sub === 'string' ? payload.sub : undefined;
    const email = typeof payload.email === 'string' ? payload.email : undefined;
    const emailVerified = typeof payload.email_verified === 'boolean'
        ? payload.email_verified
        : (typeof payload.email_verified === 'string' ? payload.email_verified === 'true' : false);
    const name = typeof payload.name === 'string' ? payload.name : '';

    // Apple may not include email on subsequent sign-ins.
    // In that case we need a fallback — the caller should handle this.
    if (!sub) {
        throw new AppError(502, 'Apple sign-in failed');
    }

    return {
        sub,
        email: email || `apple_${sub}@placeholder.local`,
        emailVerified: email ? emailVerified : true, // Apple always verifies email on first auth
        name: name || 'Apple User',
    };
}

export function buildAppleSuccessRedirectUrl(redirectTo: string): string {
    return joinAppPath(getFrontendAppUrl(), sanitizeRedirectPath(redirectTo));
}

export function buildAppleErrorRedirectUrl(args: {
    redirectTo: string;
    errorCode: string;
}): string {
    const url = new URL(joinAppPath(getFrontendAppUrl(), '/login'));
    url.searchParams.set('authError', `apple_${args.errorCode}`);
    url.searchParams.set('redirectTo', sanitizeRedirectPath(args.redirectTo));
    return url.toString();
}

export function mapAppleAuthErrorCode(error: unknown): string {
    if (error instanceof AppError) {
        switch (error.message) {
            case 'Apple sign-in is not configured on the server':
                return 'configuration_invalid';
            case 'Apple sign-in request is invalid or has expired':
                return 'state_invalid';
            case 'Your Apple account email must be verified before you can continue':
                return 'email_unverified';
            case 'This email is already linked to a different Apple account':
                return 'account_conflict';
            default:
                return 'sign_in_failed';
        }
    }
    return 'sign_in_failed';
}

export function getAppleClientSecretForFrontend(): string {
    // Only generate a client secret if Apple is configured
    try {
        return generateAppleClientSecret();
    } catch {
        return '';
    }
}
