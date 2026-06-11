import { describe, expect, it } from 'vitest';
import {
    buildGoogleAccountMutation,
    GoogleAccountLinkingError,
    normalizeEmail,
    type GoogleIdentityProfile,
    type StoredAuthUser,
} from './auth-account-linking.js';

function createUser(overrides: Partial<StoredAuthUser> = {}): StoredAuthUser {
    return {
        id: 'user-1',
        email: 'person@example.com',
        displayName: 'Person Example',
        profilePhotoUrl: null,
        passwordHash: '$2b$12$abc',
        googleId: null,
        googleEmailVerified: false,
        googleLinkedAt: null,
        ...overrides,
    };
}

function createProfile(
    overrides: Partial<GoogleIdentityProfile> = {}
): GoogleIdentityProfile {
    return {
        sub: 'google-sub-1',
        email: 'Person@Example.com',
        emailVerified: true,
        name: 'Person Example',
        picture: 'https://example.com/google-avatar.jpg',
        ...overrides,
    };
}

describe('normalizeEmail', () => {
    it('trims whitespace and lowercases the email', () => {
        expect(normalizeEmail('  Person@Example.com  ')).toBe('person@example.com');
    });
});

describe('buildGoogleAccountMutation', () => {
    it('creates a Google-only account when no user exists', () => {
        const now = new Date('2026-05-18T10:00:00.000Z');

        const mutation = buildGoogleAccountMutation({
            existingByGoogleId: null,
            existingByEmail: null,
            profile: createProfile(),
            now,
        });

        expect(mutation).toEqual({
            type: 'create',
            data: {
                email: 'person@example.com',
                displayName: 'Person Example',
                passwordHash: null,
                profilePhotoUrl: 'https://example.com/google-avatar.jpg',
                emailVerified: true,
                googleId: 'google-sub-1',
                googleEmailVerified: true,
                googleLinkedAt: now,
            },
        });
    });

    it('links Google onto an existing password account with the same email', () => {
        const now = new Date('2026-05-18T10:00:00.000Z');
        const existingUser = createUser({ email: 'Person@Example.com' });

        const mutation = buildGoogleAccountMutation({
            existingByGoogleId: null,
            existingByEmail: existingUser,
            profile: createProfile(),
            now,
        });

        expect(mutation).toEqual({
            type: 'update',
            userId: existingUser.id,
            data: {
                email: 'person@example.com',
                emailVerified: true,
                googleId: 'google-sub-1',
                googleEmailVerified: true,
                googleLinkedAt: now,
                profilePhotoUrl: 'https://example.com/google-avatar.jpg',
            },
        });
    });

    it('reuses the already linked Google account even if the token email changes', () => {
        const now = new Date('2026-05-18T10:00:00.000Z');
        const existingGoogleUser = createUser({
            id: 'user-google',
            email: 'legacy@example.com',
            googleId: 'google-sub-1',
            googleLinkedAt: new Date('2026-01-01T00:00:00.000Z'),
            profilePhotoUrl: 'https://example.com/custom-photo.jpg',
        });

        const mutation = buildGoogleAccountMutation({
            existingByGoogleId: existingGoogleUser,
            existingByEmail: createUser({ id: 'user-email', email: 'person@example.com' }),
            profile: createProfile({ email: 'person@example.com' }),
            now,
        });

        expect(mutation).toEqual({
            type: 'update',
            userId: 'user-google',
            data: {
                emailVerified: true,
                googleId: 'google-sub-1',
                googleEmailVerified: true,
                googleLinkedAt: new Date('2026-01-01T00:00:00.000Z'),
            },
        });
    });

    it('rejects linking when the email is already linked to a different Google account', () => {
        expect(() =>
            buildGoogleAccountMutation({
                existingByGoogleId: null,
                existingByEmail: createUser({ googleId: 'google-sub-other' }),
                profile: createProfile({ sub: 'google-sub-1' }),
            })
        ).toThrowError(
            new GoogleAccountLinkingError(
                'EMAIL_LINKED_TO_OTHER_GOOGLE_ACCOUNT',
                'This email is already linked to a different Google account'
            )
        );
    });

    it('rejects unverified Google emails', () => {
        expect(() =>
            buildGoogleAccountMutation({
                existingByGoogleId: null,
                existingByEmail: null,
                profile: createProfile({ emailVerified: false }),
            })
        ).toThrowError(
            new GoogleAccountLinkingError(
                'EMAIL_NOT_VERIFIED',
                'Your Google account email must be verified before you can continue'
            )
        );
    });
});