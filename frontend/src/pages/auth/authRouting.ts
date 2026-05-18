interface AuthLocationLike {
    search: string;
    state: {
        from?: {
            pathname?: string;
            search?: string;
            hash?: string;
        };
    } | null;
}

export type AuthEntryPath = '/login' | '/register';

export function sanitizeAuthRedirectTo(value: string | null | undefined): string {
    if (!value) {
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

export function resolveAuthRedirectTo(location: AuthLocationLike): string {
    const stateRedirect = location.state?.from?.pathname
        ? `${location.state.from.pathname}${location.state.from.search ?? ''}${location.state.from.hash ?? ''}`
        : null;

    if (stateRedirect) {
        return sanitizeAuthRedirectTo(stateRedirect);
    }

    const searchParams = new URLSearchParams(location.search);
    return sanitizeAuthRedirectTo(searchParams.get('redirectTo'));
}

export function buildAuthSwitchUrl(
    entryPath: AuthEntryPath,
    redirectTo: string
): string {
    const safeRedirectTo = sanitizeAuthRedirectTo(redirectTo);
    if (safeRedirectTo === '/dashboard') {
        return entryPath;
    }

    const searchParams = new URLSearchParams({ redirectTo: safeRedirectTo });
    return `${entryPath}?${searchParams.toString()}`;
}

export function getGoogleAuthErrorMessage(errorCode: string | null): string {
    switch (errorCode) {
        case 'google_access_denied':
            return 'Google sign-in was cancelled before it could be completed.';
        case 'google_email_unverified':
            return 'Your Google account email must be verified before you can continue.';
        case 'google_account_conflict':
            return 'This email is already linked to a different Google account.';
        case 'google_configuration_invalid':
            return 'Google sign-in is not configured yet. Try again after the server is updated.';
        case 'google_state_invalid':
            return 'Google sign-in expired. Please try again.';
        case 'google_sign_in_failed':
            return 'Google sign-in failed. Please try again.';
        default:
            return '';
    }
}