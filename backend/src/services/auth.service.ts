import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error.js';
import type { AuthPayload } from '../middleware/auth.js';
import type { User } from '@prisma/client';
import {
  buildGoogleAccountMutation,
  GoogleAccountLinkingError,
  normalizeEmail,
  type GoogleIdentityProfile,
} from './auth-account-linking.js';
import { getSignedImageUrl, isR2ObjectKey } from './r2-storage.service.js';

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function generateToken(userId: string): string {
  const payload: AuthPayload = { userId };
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
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

  const token = generateToken(user.id);
  return { user: await sanitizeUser(user), token };
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

  const token = generateToken(user.id);
  return { user: await sanitizeUser(user), token };
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

  const token = generateToken(user.id);
  return { user: await sanitizeUser(user), token };
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return sanitizeUser(user);
}

export function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
}
