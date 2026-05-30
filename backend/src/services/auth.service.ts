import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import {
  ACCESS_TOKEN_MAX_AGE_MS,
  REFRESH_TOKEN_MAX_AGE_MS,
  type AuthTokenPayload,
  type RefreshTokenPayload,
} from '../lib/auth-session.js';
import { AppError } from '../middleware/error.js';
import type { User } from '@prisma/client';
import {
  buildGoogleAccountMutation,
  GoogleAccountLinkingError,
  normalizeEmail,
  type GoogleIdentityProfile,
} from './auth-account-linking.js';
import { getSignedImageUrl, isR2ObjectKey } from './r2-storage.service.js';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'dev-secret';
const REFRESH_TOKEN_SECRET =
  process.env.JWT_REFRESH_SECRET || ACCESS_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = Math.floor(
  ACCESS_TOKEN_MAX_AGE_MS / 1000
);
const REFRESH_TOKEN_EXPIRES_IN_SECONDS = Math.floor(
  REFRESH_TOKEN_MAX_AGE_MS / 1000
);

function generateAccessToken(userId: string): string {
  const payload: AuthTokenPayload = { userId, tokenType: 'access' };
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  } as jwt.SignOptions);
}

function generateRefreshToken(userId: string): string {
  const payload: RefreshTokenPayload = { userId, tokenType: 'refresh' };
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN_SECONDS,
  } as jwt.SignOptions);
}

function issueSessionTokens(userId: string) {
  return {
    accessToken: generateAccessToken(userId),
    refreshToken: generateRefreshToken(userId),
  };
}

function isAuthTokenPayload(payload: unknown): payload is AuthTokenPayload {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      'userId' in payload &&
      typeof payload.userId === 'string' &&
      'tokenType' in payload &&
      payload.tokenType === 'access'
  );
}

function isRefreshTokenPayload(payload: unknown): payload is RefreshTokenPayload {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      'userId' in payload &&
      typeof payload.userId === 'string' &&
      'tokenType' in payload &&
      payload.tokenType === 'refresh'
  );
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
    if (!isAuthTokenPayload(payload)) {
      throw new AppError(401, 'Invalid or expired token');
    }

    return payload;
  } catch {
    throw new AppError(401, 'Invalid or expired token');
  }
}

function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const payload = jwt.verify(token, REFRESH_TOKEN_SECRET);
    if (!isRefreshTokenPayload(payload)) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    return payload;
  } catch {
    throw new AppError(401, 'Invalid or expired refresh token');
  }
}

export async function sanitizeUser(user: User) {
  let profilePhotoUrl = user.profilePhotoUrl;
  if (isR2ObjectKey(profilePhotoUrl)) {
    profilePhotoUrl = (await getSignedImageUrl(profilePhotoUrl)).url;
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    profilePhotoUrl,
    hasPassword: Boolean(user.passwordHash),
    isGoogleConnected: Boolean(user.googleId),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function findUserByEmail(email: string) {
  return prisma.user.findFirst({
    where: {
      email: {
        equals: normalizeEmail(email),
        mode: 'insensitive',
      },
    },
  });
}

export async function registerUser(
  email: string,
  password: string,
  displayName: string
) {
  const normalizedEmail = normalizeEmail(email);
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    if (existing.googleId && !existing.passwordHash) {
      throw new AppError(
        409,
        'An account with this email already exists. Continue with Google to sign in.'
      );
    }

    throw new AppError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { email: normalizedEmail, passwordHash, displayName },
  });

  return {
    user: await sanitizeUser(user),
    ...issueSessionTokens(user.id),
  };
}

export async function loginUser(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  if (!user.passwordHash) {
    throw new AppError(
      401,
      'This account uses Google sign-in. Continue with Google to sign in.'
    );
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'Invalid email or password');
  }

  return {
    user: await sanitizeUser(user),
    ...issueSessionTokens(user.id),
  };
}

export async function loginOrRegisterWithGoogle(profile: GoogleIdentityProfile) {
  const existingByGoogleId = await prisma.user.findUnique({
    where: { googleId: profile.sub },
  });
  const existingByEmail = existingByGoogleId
    ? null
    : await findUserByEmail(profile.email);

  let user: User;

  try {
    const mutation = buildGoogleAccountMutation({
      existingByGoogleId,
      existingByEmail,
      profile,
    });

    user =
      mutation.type === 'create'
        ? await prisma.user.create({ data: mutation.data })
        : await prisma.user.update({
          where: { id: mutation.userId },
          data: mutation.data,
        });
  } catch (error) {
    if (error instanceof GoogleAccountLinkingError) {
      if (error.code === 'EMAIL_NOT_VERIFIED') {
        throw new AppError(400, error.message);
      }

      throw new AppError(409, error.message);
    }

    throw error;
  }

  return {
    user: await sanitizeUser(user),
    ...issueSessionTokens(user.id),
  };
}

export async function refreshUserSession(incomingRefreshToken: string) {
  const payload = verifyRefreshToken(incomingRefreshToken);
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });

  if (!user) {
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  return {
    user: await sanitizeUser(user),
    ...issueSessionTokens(user.id),
  };
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return sanitizeUser(user);
}
