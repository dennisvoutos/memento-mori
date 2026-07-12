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
import {
  buildAppleAccountMutation,
  AppleAccountLinkingError,
  type AppleIdentityProfile,
} from './apple-account-linking.js';
import { doesEmailRequireVerification } from './email-verification-policy.js';
import { getSignedImageUrl, isR2ObjectKey } from './r2-storage.service.js';
import { sendVerificationEmail, sendPasswordResetEmail } from './email.service.js';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'dev-secret';
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = Math.floor(
  ACCESS_TOKEN_MAX_AGE_MS / 1000
);
const REFRESH_TOKEN_BYTE_LENGTH = 32;
const EMAIL_VERIFICATION_TOKEN_BYTE_LENGTH = 32;
const MAX_USER_AGENT_LENGTH = 512;
const MAX_IP_ADDRESS_LENGTH = 128;
const DEFAULT_EMAIL_VERIFICATION_TTL_HOURS = 24;
const ACCOUNT_NOT_VERIFIED_MESSAGE =
  'Account not verified. Check your email or request a new link.';
const EMAIL_VERIFICATION_SEND_ERROR_MESSAGE =
  'Unable to send verification email right now. Please try again later.';
const DEFAULT_PASSWORD_RESET_TTL_MINUTES = 60;
const PASSWORD_RESET_TOKEN_BYTE_LENGTH = 32;

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
  const payload: AuthTokenPayload = {
    userId,
    tokenType: 'access',
    jti: crypto.randomUUID(),
  };
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  } as jwt.SignOptions);
}

function generateRefreshToken(): string {
  return crypto.randomBytes(REFRESH_TOKEN_BYTE_LENGTH).toString('hex');
}

function generateEmailVerificationToken(): string {
  return crypto.randomBytes(EMAIL_VERIFICATION_TOKEN_BYTE_LENGTH).toString('hex');
}

function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function hashEmailVerificationToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getPositiveIntegerFromEnv(
  value: string | undefined,
  fallback: number
): number {
  const parsed = Number.parseInt(value?.trim() || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getEmailVerificationExpiry(now = new Date()): Date {
  const ttlHours = getPositiveIntegerFromEnv(
    process.env.EMAIL_VERIFICATION_TTL_HOURS,
    DEFAULT_EMAIL_VERIFICATION_TTL_HOURS
  );

  return new Date(now.getTime() + ttlHours * 60 * 60 * 1000);
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
    typeof (payload as Record<string, unknown>).userId === 'string' &&
    'tokenType' in payload &&
    (payload as Record<string, unknown>).tokenType === 'access' &&
    'jti' in payload &&
    typeof (payload as Record<string, unknown>).jti === 'string'
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

export async function sanitizeUser(user: User & { connectedServices?: Array<{ provider: string }> }) {
  let profilePhotoUrl = user.profilePhotoUrl;
  if (isR2ObjectKey(profilePhotoUrl)) {
    profilePhotoUrl = (await getSignedImageUrl(profilePhotoUrl)).url;
  }

  const hasGooglePhotosConnected = user.connectedServices?.some(
    (cs) => cs.provider === 'GOOGLE_PHOTOS'
  ) ?? false;

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    profilePhotoUrl,
    emailVerified: user.emailVerified,
    hasPassword: Boolean(user.passwordHash),
    isGoogleConnected: Boolean(user.googleId),
    isAppleConnected: Boolean(user.appleId),
    isGooglePhotosConnected: hasGooglePhotosConnected,
    acceptedTermsVersion: user.acceptedTermsVersion,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

async function replaceEmailVerificationToken(
  user: Pick<User, 'id' | 'email' | 'displayName'>
) {
  const token = generateEmailVerificationToken();
  const verificationExpires = getEmailVerificationExpiry();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationTokenHash: hashEmailVerificationToken(token),
      verificationExpires,
    },
  });

  await sendVerificationEmail({
    email: user.email,
    displayName: user.displayName,
    token,
  });

  return verificationExpires;
}

async function ensureUserEmailVerificationState(user: User): Promise<User> {
  if (user.emailVerified || doesEmailRequireVerification(user.email)) {
    return user;
  }

  return prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationTokenHash: null,
      verificationExpires: null,
    },
  });
}

export async function updateUserProfileAfterEmailChange(
  user: Pick<
    User,
    | 'id'
    | 'email'
    | 'displayName'
    | 'emailVerified'
    | 'verificationTokenHash'
    | 'verificationExpires'
  >,
  nextProfile: {
    email: string;
    displayName: string;
  }
) {
  if (!doesEmailRequireVerification(nextProfile.email)) {
    return prisma.user.update({
      where: { id: user.id },
      data: {
        email: nextProfile.email,
        displayName: nextProfile.displayName,
        emailVerified: true,
        verificationTokenHash: null,
        verificationExpires: null,
      },
    });
  }

  const token = generateEmailVerificationToken();
  const verificationExpires = getEmailVerificationExpiry();
  const verificationTokenHash = hashEmailVerificationToken(token);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      email: nextProfile.email,
      displayName: nextProfile.displayName,
      emailVerified: false,
      verificationTokenHash,
      verificationExpires,
    },
  });

  try {
    await sendVerificationEmail({
      email: nextProfile.email,
      displayName: nextProfile.displayName,
      token,
    });
  } catch {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        verificationTokenHash: user.verificationTokenHash,
        verificationExpires: user.verificationExpires,
      },
    });

    throw new AppError(503, EMAIL_VERIFICATION_SEND_ERROR_MESSAGE);
  }

  return updatedUser;
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
  const emailRequiresVerification = doesEmailRequireVerification(normalizedEmail);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      displayName,
      emailVerified: !emailRequiresVerification,
    },
  });

  if (emailRequiresVerification) {
    try {
      await replaceEmailVerificationToken(user);
    } catch {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
      throw new AppError(503, EMAIL_VERIFICATION_SEND_ERROR_MESSAGE);
    }
  }

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
  const existingUser = await findUserByEmail(email);
  const user = existingUser ? await ensureUserEmailVerificationState(existingUser) : null;
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

  if (!user.emailVerified) {
    throw new AppError(403, ACCOUNT_NOT_VERIFIED_MESSAGE);
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

export async function loginOrRegisterWithApple(
  profile: AppleIdentityProfile,
  sessionContext?: SessionContext
) {
  const existingByAppleId = await prisma.user.findUnique({
    where: { appleId: profile.sub },
  });
  const existingByEmail = existingByAppleId
    ? null
    : await findUserByEmail(profile.email);

  let user: User;

  try {
    const mutation = buildAppleAccountMutation({
      existingByAppleId,
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
    if (error instanceof AppleAccountLinkingError) {
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

export async function resendVerificationEmailForAccount(email: string) {
  const existingUser = await findUserByEmail(email);
  const user = existingUser
    ? await ensureUserEmailVerificationState(existingUser)
    : null;

  if (!user || user.emailVerified) {
    return false;
  }

  try {
    await replaceEmailVerificationToken(user);
  } catch {
    throw new AppError(503, EMAIL_VERIFICATION_SEND_ERROR_MESSAGE);
  }

  return true;
}

export async function verifyEmailAddress(token: string) {
  const hashedToken = hashEmailVerificationToken(token);
  const now = new Date();

  const user = await prisma.user.findFirst({
    where: {
      verificationTokenHash: hashedToken,
      verificationExpires: { gt: now },
    },
  });

  if (!user) {
    throw new AppError(400, 'Invalid or expired link');
  }

  const verifiedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationTokenHash: null,
      verificationExpires: null,
    },
  });

  return sanitizeUser(verifiedUser);
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
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { connectedServices: { select: { provider: true } } },
  });
  const user = existingUser
    ? await ensureUserEmailVerificationState(existingUser)
    : null;
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return sanitizeUser(user);
}

// ── Password Reset ──

function hashPasswordResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getPasswordResetExpiry(now = new Date()): Date {
  const ttlMinutes = getPositiveIntegerFromEnv(
    process.env.PASSWORD_RESET_TTL_MINUTES,
    DEFAULT_PASSWORD_RESET_TTL_MINUTES
  );

  return new Date(now.getTime() + ttlMinutes * 60 * 1000);
}

export async function initiatePasswordReset(email: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    console.log(`Password reset requested for unknown email: ${normalizedEmail.slice(0, 3)}***`);
    return;
  }

  const token = crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTE_LENGTH).toString('hex');
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = getPasswordResetExpiry();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: tokenHash,
      resetPasswordExpires: expiresAt,
    },
  });

  try {
    await sendPasswordResetEmail({
      email: user.email,
      displayName: user.displayName,
      token,
    });
    console.log(`Password reset email sent for user ${user.id}`);
  } catch (error) {
    console.error(`Failed to send password reset email for user ${user.id}:`, error);
    // Don't expose email delivery failures to the caller
  }
}

export async function validateResetToken(token: string): Promise<{ valid: boolean }> {
  const tokenHash = hashPasswordResetToken(token);
  const now = new Date();

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { gt: now },
    },
  });

  if (!user) {
    console.log('Invalid or expired password reset token used');
    return { valid: false };
  }

  return { valid: true };
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<void> {
  const tokenHash = hashPasswordResetToken(token);
  const now = new Date();

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { gt: now },
    },
  });

  if (!user) {
    console.log('Password reset attempt with invalid or expired token');
    throw new AppError(400, 'Invalid or expired reset link');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      passwordChangedAt: now,
    },
  });

  await revokeAllRefreshSessionsForUser(user.id, 'PASSWORD_CHANGED');
  console.log(`Password reset successful for user ${user.id}`);
}
