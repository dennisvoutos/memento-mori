import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import {
  ACCESS_TOKEN_MAX_AGE_MS,
  REFRESH_TOKEN_MAX_AGE_MS,
  type AuthTokenPayload,
} from '../lib/auth-session.js';
import { AppError } from '../middleware/error.js';
import type { Prisma, User } from '@prisma/client';
import {
  buildGoogleAccountMutation,
  GoogleAccountLinkingError,
  normalizeEmail,
  type GoogleIdentityProfile,
} from './auth-account-linking.js';
import { getSignedImageUrl, isR2ObjectKey } from './r2-storage.service.js';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'dev-secret';
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = Math.floor(
  ACCESS_TOKEN_MAX_AGE_MS / 1000
);
const REFRESH_TOKEN_BYTE_LENGTH = 32;
const MAX_USER_AGENT_LENGTH = 512;
const MAX_IP_ADDRESS_LENGTH = 128;

interface RefreshSessionRecord {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  lastUsedAt: Date | null;
  rotatedAt: Date | null;
  revokedAt: Date | null;
  revokedReason: string | null;
  replacedById: string | null;
  createdAt: Date;
}

interface RefreshSessionDelegate {
  create(args: { data: Record<string, unknown> }): Promise<RefreshSessionRecord>;
  findUnique(args: {
    where: { tokenHash: string };
  }): Promise<RefreshSessionRecord | null>;
  updateMany(args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }): Promise<{ count: number }>;
  update(args: {
    where: { id: string };
    data: { replacedById: string };
  }): Promise<RefreshSessionRecord>;
}

type PrismaSessionClient = (Prisma.TransactionClient | typeof prisma) & {
  refreshSession: RefreshSessionDelegate;
};

const sessionPrisma = prisma as PrismaSessionClient;

export interface SessionContext {
  userAgent?: string | null;
  ipAddress?: string | null;
}

type RefreshSessionRevokeReason =
  | 'ACCOUNT_DELETED'
  | 'LOGOUT'
  | 'PASSWORD_CHANGED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_REUSE_DETECTED';

function generateAccessToken(userId: string): string {
  const payload: AuthTokenPayload = { userId, tokenType: 'access' };
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  } as jwt.SignOptions);
}

function generateRefreshToken(): string {
  return crypto.randomBytes(REFRESH_TOKEN_BYTE_LENGTH).toString('hex');
}

function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getRefreshTokenExpiry(now = new Date()): Date {
  return new Date(now.getTime() + REFRESH_TOKEN_MAX_AGE_MS);
}

function normalizeSessionContextValue(
  value: string | null | undefined,
  maxLength: number
): string | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  return trimmedValue.slice(0, maxLength);
}

function getStoredSessionContext(sessionContext?: SessionContext) {
  return {
    userAgent: normalizeSessionContextValue(
      sessionContext?.userAgent,
      MAX_USER_AGENT_LENGTH
    ),
    ipAddress: normalizeSessionContextValue(
      sessionContext?.ipAddress,
      MAX_IP_ADDRESS_LENGTH
    ),
  };
}

async function createRefreshSession(
  tx: PrismaSessionClient,
  args: {
    userId: string;
    familyId?: string;
    sessionContext?: SessionContext;
    now?: Date;
  }
) {
  const now = args.now ?? new Date();
  const refreshToken = generateRefreshToken();
  const storedSessionContext = getStoredSessionContext(args.sessionContext);
  const session = await tx.refreshSession.create({
    data: {
      userId: args.userId,
      familyId: args.familyId ?? crypto.randomUUID(),
      tokenHash: hashRefreshToken(refreshToken),
      userAgent: storedSessionContext.userAgent,
      ipAddress: storedSessionContext.ipAddress,
      expiresAt: getRefreshTokenExpiry(now),
    },
  });

  return { refreshToken, session };
}

async function issueSessionTokens(
  userId: string,
  sessionContext?: SessionContext
) {
  const { refreshToken } = await createRefreshSession(sessionPrisma, {
    userId,
    sessionContext,
  });

  return {
    accessToken: generateAccessToken(userId),
    refreshToken,
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

async function revokeRefreshSessionFamily(
  tx: PrismaSessionClient,
  familyId: string,
  reason: RefreshSessionRevokeReason,
  now = new Date()
): Promise<void> {
  await tx.refreshSession.updateMany({
    where: {
      familyId,
      revokedAt: null,
    },
    data: {
      revokedAt: now,
      revokedReason: reason,
    },
  });
}

export async function revokeRefreshSessionByToken(
  refreshToken: string,
  reason: RefreshSessionRevokeReason
): Promise<void> {
  await sessionPrisma.refreshSession.updateMany({
    where: {
      tokenHash: hashRefreshToken(refreshToken),
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revokedReason: reason,
    },
  });
}

export async function revokeAllRefreshSessionsForUser(
  userId: string,
  reason: RefreshSessionRevokeReason
): Promise<void> {
  await sessionPrisma.refreshSession.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revokedReason: reason,
    },
  });
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
  displayName: string,
  sessionContext?: SessionContext
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
    ...(await issueSessionTokens(user.id, sessionContext)),
  };
}

export async function loginUser(
  email: string,
  password: string,
  sessionContext?: SessionContext
) {
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
    ...(await issueSessionTokens(user.id, sessionContext)),
  };
}

export async function loginOrRegisterWithGoogle(
  profile: GoogleIdentityProfile,
  sessionContext?: SessionContext
) {
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
    ...(await issueSessionTokens(user.id, sessionContext)),
  };
}

export async function refreshUserSession(
  incomingRefreshToken: string,
  sessionContext?: SessionContext
) {
  const tokenHash = hashRefreshToken(incomingRefreshToken);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const sessionTx = tx as PrismaSessionClient;
    const session = await sessionTx.refreshSession.findUnique({
      where: { tokenHash },
    });

    if (!session || session.revokedAt) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    if (session.rotatedAt || session.replacedById) {
      await revokeRefreshSessionFamily(
        sessionTx,
        session.familyId,
        'TOKEN_REUSE_DETECTED',
        now
      );
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    if (session.expiresAt <= now) {
      await sessionTx.refreshSession.updateMany({
        where: {
          id: session.id,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
          revokedReason: 'TOKEN_EXPIRED',
        },
      });
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    const claimedSession = await sessionTx.refreshSession.updateMany({
      where: {
        id: session.id,
        revokedAt: null,
        rotatedAt: null,
        replacedById: null,
        expiresAt: { gt: now },
      },
      data: {
        lastUsedAt: now,
        rotatedAt: now,
      },
    });

    if (claimedSession.count !== 1) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    const user = await tx.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      await sessionTx.refreshSession.updateMany({
        where: {
          id: session.id,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
          revokedReason: 'ACCOUNT_DELETED',
        },
      });
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    const { refreshToken, session: replacementSession } =
      await createRefreshSession(sessionTx, {
        userId: user.id,
        familyId: session.familyId,
        sessionContext,
        now,
      });

    await sessionTx.refreshSession.update({
      where: { id: session.id },
      data: {
        replacedById: replacementSession.id,
      },
    });

    return {
      accessToken: generateAccessToken(user.id),
      refreshToken,
    };
  });
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return sanitizeUser(user);
}
