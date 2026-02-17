import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error.js';
import type { Prisma } from '@prisma/client';

export async function createMemorial(
  ownerId: string,
  data: {
    fullName: string;
    dateOfBirth: string;
    dateOfPassing: string;
    biography?: string | null;
    privacyLevel?: 'PRIVATE' | 'SHARED_LINK' | 'PUBLIC';
  }
) {
  const memorial = await prisma.memorial.create({
    data: {
      ownerId,
      fullName: data.fullName,
      dateOfBirth: data.dateOfBirth,
      dateOfPassing: data.dateOfPassing,
      biography: data.biography ?? null,
      privacyLevel: data.privacyLevel ?? 'PRIVATE',
    },
  });

  // If shared link, generate access token
  if (memorial.privacyLevel === 'SHARED_LINK') {
    await prisma.memorialAccess.create({
      data: {
        memorialId: memorial.id,
        accessToken: uuidv4(),
        permission: 'VIEW',
      },
    });
  }

  return memorial;
}

export async function getUserMemorials(userId: string) {
  return prisma.memorial.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getMemorialById(memorialId: string, userId?: string) {
  const memorial = await prisma.memorial.findUnique({
    where: { id: memorialId },
  });

  if (!memorial) {
    throw new AppError(404, 'Memorial not found');
  }

  // Access control
  if (memorial.privacyLevel === 'PUBLIC') {
    return memorial;
  }

  if (!userId) {
    throw new AppError(403, 'Access denied');
  }

  if (memorial.ownerId === userId) {
    return memorial;
  }

  // Check access table
  const access = await prisma.memorialAccess.findFirst({
    where: { memorialId, userId },
  });

  if (!access) {
    throw new AppError(403, 'Access denied');
  }

  return memorial;
}

export async function getMemorialByAccessToken(accessToken: string) {
  const access = await prisma.memorialAccess.findUnique({
    where: { accessToken },
    include: { memorial: true },
  });

  if (!access) {
    throw new AppError(404, 'Memorial not found');
  }

  return { memorial: access.memorial, permission: access.permission };
}

export async function updateMemorial(
  memorialId: string,
  userId: string,
  data: {
    fullName?: string;
    dateOfBirth?: string;
    dateOfPassing?: string;
    biography?: string | null;
    privacyLevel?: 'PRIVATE' | 'SHARED_LINK' | 'PUBLIC';
  }
) {
  await assertAdminAccess(memorialId, userId);

  const memorial = await prisma.memorial.update({
    where: { id: memorialId },
    data,
  });

  // If switching to shared link, generate token if not exists
  if (memorial.privacyLevel === 'SHARED_LINK') {
    const existingLink = await prisma.memorialAccess.findFirst({
      where: { memorialId, accessToken: { not: null } },
    });
    if (!existingLink) {
      await prisma.memorialAccess.create({
        data: {
          memorialId,
          accessToken: uuidv4(),
          permission: 'VIEW',
        },
      });
    }
  }

  return memorial;
}

export async function updateMemorialPhoto(
  memorialId: string,
  userId: string,
  photoUrl: string
) {
  await assertAdminAccess(memorialId, userId);
  return prisma.memorial.update({
    where: { id: memorialId },
    data: { profilePhotoUrl: photoUrl },
  });
}

export async function deleteMemorial(memorialId: string, userId: string) {
  const memorial = await prisma.memorial.findUnique({
    where: { id: memorialId },
  });

  if (!memorial) {
    throw new AppError(404, 'Memorial not found');
  }

  if (memorial.ownerId !== userId) {
    throw new AppError(403, 'Only the owner can delete a memorial');
  }

  // Cascade delete is handled by Prisma schema (onDelete: Cascade)
  await prisma.memorial.delete({ where: { id: memorialId } });
}

// ── Access Management ──

export async function getMemorialAccess(memorialId: string, userId: string) {
  await assertAdminAccess(memorialId, userId);
  return prisma.memorialAccess.findMany({
    where: { memorialId },
    include: { user: { select: { id: true, email: true, displayName: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function inviteUser(
  memorialId: string,
  adminUserId: string,
  email: string,
  permission: 'VIEW' | 'CONTRIBUTE' | 'ADMIN'
) {
  await assertAdminAccess(memorialId, adminUserId);

  // Check if user exists
  const user = await prisma.user.findUnique({ where: { email } });

  // Check for existing access
  const existing = await prisma.memorialAccess.findFirst({
    where: {
      memorialId,
      OR: [{ email }, ...(user ? [{ userId: user.id }] : [])],
    },
  });

  if (existing) {
    throw new AppError(409, 'This user already has access');
  }

  return prisma.memorialAccess.create({
    data: {
      memorialId,
      userId: user?.id ?? null,
      email,
      permission,
    },
  });
}

export async function updateAccess(
  memorialId: string,
  accessId: string,
  adminUserId: string,
  permission: 'VIEW' | 'CONTRIBUTE' | 'ADMIN'
) {
  await assertAdminAccess(memorialId, adminUserId);
  return prisma.memorialAccess.update({
    where: { id: accessId },
    data: { permission },
  });
}

export async function revokeAccess(
  memorialId: string,
  accessId: string,
  adminUserId: string
) {
  await assertAdminAccess(memorialId, adminUserId);
  await prisma.memorialAccess.delete({ where: { id: accessId } });
}

export async function getShareLink(memorialId: string, userId: string) {
  await assertAdminAccess(memorialId, userId);

  let access = await prisma.memorialAccess.findFirst({
    where: { memorialId, accessToken: { not: null } },
  });

  if (!access) {
    access = await prisma.memorialAccess.create({
      data: {
        memorialId,
        accessToken: uuidv4(),
        permission: 'VIEW',
      },
    });
  }

  return access.accessToken;
}

// ── Helpers ──

export async function assertAdminAccess(memorialId: string, userId: string) {
  const memorial = await prisma.memorial.findUnique({
    where: { id: memorialId },
  });

  if (!memorial) {
    throw new AppError(404, 'Memorial not found');
  }

  if (memorial.ownerId === userId) return;

  const access = await prisma.memorialAccess.findFirst({
    where: { memorialId, userId, permission: 'ADMIN' },
  });

  if (!access) {
    throw new AppError(403, 'Admin access required');
  }
}

export async function assertContributeAccess(
  memorialId: string,
  userId: string
) {
  const memorial = await prisma.memorial.findUnique({
    where: { id: memorialId },
  });

  if (!memorial) {
    throw new AppError(404, 'Memorial not found');
  }

  if (memorial.ownerId === userId) return;

  const access = await prisma.memorialAccess.findFirst({
    where: {
      memorialId,
      userId,
      permission: { in: ['CONTRIBUTE', 'ADMIN'] },
    },
  });

  if (!access) {
    throw new AppError(403, 'Contribute access required');
  }
}

export async function assertViewAccess(memorialId: string, userId?: string) {
  const memorial = await prisma.memorial.findUnique({
    where: { id: memorialId },
  });

  if (!memorial) {
    throw new AppError(404, 'Memorial not found');
  }

  if (memorial.privacyLevel === 'PUBLIC') return;

  if (!userId) {
    throw new AppError(403, 'Access denied');
  }

  if (memorial.ownerId === userId) return;

  const access = await prisma.memorialAccess.findFirst({
    where: { memorialId, userId },
  });

  if (!access) {
    throw new AppError(403, 'Access denied');
  }
}
