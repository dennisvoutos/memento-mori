export interface StoredAuthUser {
    id: string;
    email: string;
    displayName: string;
    profilePhotoUrl: string | null;
    passwordHash: string | null;
    googleId: string | null;
    googleEmailVerified: boolean;
    googleLinkedAt: Date | null;
}

export interface GoogleIdentityProfile {
    sub: string;
    email: string;
    emailVerified: boolean;
    name: string;
    picture: string | null;
}

interface GoogleAccountBaseFields {
    googleId: string;
    googleEmailVerified: boolean;
    googleLinkedAt: Date;
    profilePhotoUrl?: string | null;
}

export interface GoogleAccountCreateMutation {
    type: 'create';
    data: GoogleAccountBaseFields & {
        email: string;
        displayName: string;
        passwordHash: null;
        profilePhotoUrl: string | null;
    };
}

export interface GoogleAccountUpdateMutation {
    type: 'update';
    userId: string;
    data: GoogleAccountBaseFields & {
        email?: string;
    };
}

export type GoogleAccountMutation =
    | GoogleAccountCreateMutation
    | GoogleAccountUpdateMutation;

export type GoogleAccountLinkingErrorCode =
    | 'EMAIL_NOT_VERIFIED'
    | 'EMAIL_LINKED_TO_OTHER_GOOGLE_ACCOUNT';

export class GoogleAccountLinkingError extends Error {
    constructor(
        public code: GoogleAccountLinkingErrorCode,
        message: string
    ) {
        super(message);
        this.name = 'GoogleAccountLinkingError';
    }
}

export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

function defaultDisplayName(profile: GoogleIdentityProfile): string {
    const trimmedName = profile.name.trim();
    if (trimmedName) {
        return trimmedName;
    }

    return normalizeEmail(profile.email).split('@')[0] || 'Google User';
}

function buildGoogleFields(
    existingUser: StoredAuthUser,
    profile: GoogleIdentityProfile,
    linkedAt: Date,
    nextEmail?: string
): GoogleAccountUpdateMutation['data'] {
    const data: GoogleAccountUpdateMutation['data'] = {
        googleId: profile.sub,
        googleEmailVerified: profile.emailVerified,
        googleLinkedAt: existingUser.googleLinkedAt ?? linkedAt,
    };

    if (!existingUser.profilePhotoUrl && profile.picture) {
        data.profilePhotoUrl = profile.picture;
    }

    if (nextEmail && normalizeEmail(existingUser.email) === normalizeEmail(nextEmail)) {
        data.email = normalizeEmail(nextEmail);
    } else if (nextEmail) {
        data.email = nextEmail;
    }

    return data;
}

export function buildGoogleAccountMutation(args: {
    existingByGoogleId: StoredAuthUser | null;
    existingByEmail: StoredAuthUser | null;
    profile: GoogleIdentityProfile;
    now?: Date;
}): GoogleAccountMutation {
    const { existingByGoogleId, existingByEmail, profile } = args;

    if (!profile.emailVerified) {
        throw new GoogleAccountLinkingError(
            'EMAIL_NOT_VERIFIED',
            'Your Google account email must be verified before you can continue'
        );
    }

    const linkedAt = args.now ?? new Date();
    const normalizedEmail = normalizeEmail(profile.email);

    if (existingByGoogleId) {
        const shouldCanonicalizeEmail =
            normalizeEmail(existingByGoogleId.email) === normalizedEmail;

        return {
            type: 'update',
            userId: existingByGoogleId.id,
            data: buildGoogleFields(
                existingByGoogleId,
                profile,
                linkedAt,
                shouldCanonicalizeEmail ? normalizedEmail : undefined
            ),
        };
    }

    if (existingByEmail) {
        if (existingByEmail.googleId && existingByEmail.googleId !== profile.sub) {
            throw new GoogleAccountLinkingError(
                'EMAIL_LINKED_TO_OTHER_GOOGLE_ACCOUNT',
                'This email is already linked to a different Google account'
            );
        }

        return {
            type: 'update',
            userId: existingByEmail.id,
            data: buildGoogleFields(existingByEmail, profile, linkedAt, normalizedEmail),
        };
    }

    return {
        type: 'create',
        data: {
            email: normalizedEmail,
            displayName: defaultDisplayName(profile),
            passwordHash: null,
            profilePhotoUrl: profile.picture,
            googleId: profile.sub,
            googleEmailVerified: true,
            googleLinkedAt: linkedAt,
        },
    };
}