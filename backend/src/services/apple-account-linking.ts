import { normalizeEmail, type StoredAuthUser } from './auth-account-linking.js';

export interface AppleIdentityProfile {
    sub: string;
    email: string;
    emailVerified: boolean;
    name: string;
}

interface AppleAccountBaseFields {
    emailVerified: boolean;
    appleId: string;
    appleEmailVerified: boolean;
    appleLinkedAt: Date;
}

export interface AppleAccountCreateMutation {
    type: 'create';
    data: AppleAccountBaseFields & {
        email: string;
        displayName: string;
        passwordHash: null;
        profilePhotoUrl: null;
    };
}

export interface AppleAccountUpdateMutation {
    type: 'update';
    userId: string;
    data: AppleAccountBaseFields & {
        email?: string;
    };
}

export type AppleAccountMutation =
    | AppleAccountCreateMutation
    | AppleAccountUpdateMutation;

export type AppleAccountLinkingErrorCode =
    | 'EMAIL_NOT_VERIFIED'
    | 'EMAIL_LINKED_TO_OTHER_APPLE_ACCOUNT';

export class AppleAccountLinkingError extends Error {
    constructor(
        public code: AppleAccountLinkingErrorCode,
        message: string
    ) {
        super(message);
        this.name = 'AppleAccountLinkingError';
    }
}

function defaultDisplayName(profile: AppleIdentityProfile): string {
    const trimmedName = profile.name.trim();
    if (trimmedName) {
        return trimmedName;
    }

    // For Apple, email might be placeholder — use a friendlier default
    const normalizedEmail = normalizeEmail(profile.email);
    if (normalizedEmail.includes('apple_') && normalizedEmail.includes('@placeholder')) {
        return 'Apple User';
    }

    return normalizedEmail.split('@')[0] || 'Apple User';
}

function buildAppleFields(
    existingUser: StoredAuthUser,
    profile: AppleIdentityProfile,
    linkedAt: Date
): AppleAccountUpdateMutation['data'] {
    const data: AppleAccountUpdateMutation['data'] = {
        emailVerified: true, // Apple always verifies email
        appleId: profile.sub,
        appleEmailVerified: profile.emailVerified,
        appleLinkedAt: existingUser.appleLinkedAt ?? linkedAt,
    };

    // Only set email if it comes from Apple (not a placeholder)
    const normalizedEmail = normalizeEmail(profile.email);
    if (!normalizedEmail.includes('@placeholder.local')) {
        if (normalizeEmail(existingUser.email) === normalizedEmail) {
            data.email = normalizedEmail;
        } else if (normalizedEmail) {
            data.email = normalizedEmail;
        }
    }

    return data;
}

export function buildAppleAccountMutation(args: {
    existingByAppleId: StoredAuthUser | null;
    existingByEmail: StoredAuthUser | null;
    profile: AppleIdentityProfile;
    now?: Date;
}): AppleAccountMutation {
    const { existingByAppleId, existingByEmail, profile } = args;

    if (!profile.emailVerified) {
        throw new AppleAccountLinkingError(
            'EMAIL_NOT_VERIFIED',
            'Your Apple account email must be verified before you can continue'
        );
    }

    const linkedAt = args.now ?? new Date();
    const normalizedEmail = normalizeEmail(profile.email);
    const isPlaceholderEmail = normalizedEmail.includes('@placeholder.local');

    if (existingByAppleId) {
        return {
            type: 'update',
            userId: existingByAppleId.id,
            data: buildAppleFields(existingByAppleId, profile, linkedAt),
        };
    }

    if (existingByEmail && !isPlaceholderEmail) {
        if (existingByEmail.appleId && existingByEmail.appleId !== profile.sub) {
            throw new AppleAccountLinkingError(
                'EMAIL_LINKED_TO_OTHER_APPLE_ACCOUNT',
                'This email is already linked to a different Apple account'
            );
        }

        return {
            type: 'update',
            userId: existingByEmail.id,
            data: buildAppleFields(existingByEmail, profile, linkedAt),
        };
    }

    return {
        type: 'create',
        data: {
            email: normalizedEmail,
            displayName: defaultDisplayName(profile),
            passwordHash: null,
            profilePhotoUrl: null,
            emailVerified: true,
            appleId: profile.sub,
            appleEmailVerified: true,
            appleLinkedAt: linkedAt,
        },
    };
}
