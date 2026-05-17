import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error.js';
import { getSignedImageUrl, isR2ObjectKey } from './r2-storage.service.js';

async function withSignedMemorialPhoto<T extends { profilePhotoUrl: string | null }>(memorial: T): Promise<T> {
  if (!isR2ObjectKey(memorial.profilePhotoUrl)) {
    return memorial;
  }

  return {
    ...memorial,
    profilePhotoUrl: (await getSignedImageUrl(memorial.profilePhotoUrl)).url,
  };
}

function canViewerUploadPhotos(
  memorial: { ownerId: string; allowPhotoUploads: boolean },
  userId?: string
): boolean {
  if (!userId) return false;
  if (memorial.ownerId === userId) return true;

  return memorial.allowPhotoUploads;
}

function withPhotoUploadCapability<T extends { ownerId: string; allowPhotoUploads: boolean }>(
  memorial: T,
  canUploadPhotos: boolean
): T & { canUploadPhotos: boolean } {
  return {
    ...memorial,
    canUploadPhotos,
  };
}

export async function createMemorial(
  ownerId: string,
  data: {
    fullName: string;
    dateOfBirth: string;
    dateOfPassing: string;
    biography?: string | null;
    privacyLevel?: 'PRIVATE' | 'SHARED_LINK' | 'PUBLIC';
    allowPhotoUploads?: boolean;
    category?: 'STARS_PUBLIC_FIGURES' | 'CHILDREN' | 'ILLNESSES' | 'CREATORS_INSPIRATIONS_PIONEERS' | 'EVERYDAY_HEROES' | 'VICTIMS_OF_EVENTS' | 'MISSING_PERSONS' | 'SUICIDE' | 'ELDERLY' | 'OTHER';
    subcategory?: string | null;
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
      allowPhotoUploads: data.allowPhotoUploads ?? false,
      category: data.category ?? 'OTHER',
      subcategory: (data.subcategory as any) ?? null,
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

  return withPhotoUploadCapability(await withSignedMemorialPhoto(memorial), true);
}

export async function getUserMemorials(userId: string) {
  const memorials = await prisma.memorial.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
  });

  return Promise.all(
    memorials.map(async (memorial) =>
      withPhotoUploadCapability(await withSignedMemorialPhoto(memorial), true)
    )
  );
}

export async function getMemorialById(memorialId: string, userId?: string) {
  const memorial = await prisma.memorial.findUnique({
    where: { id: memorialId },
  });

  if (!memorial) {
    throw new AppError(404, 'Memorial not found');
  }

  if (memorial.ownerId === userId) {
    return withPhotoUploadCapability(await withSignedMemorialPhoto(memorial), true);
  }

  const access = userId
    ? await prisma.memorialAccess.findFirst({
      where: { memorialId, userId },
      select: { permission: true },
    })
    : null;

  // Access control
  if (memorial.privacyLevel === 'PUBLIC') {
    return withPhotoUploadCapability(
      await withSignedMemorialPhoto(memorial),
      canViewerUploadPhotos(memorial, userId)
    );
  }

  if (!userId) {
    throw new AppError(403, 'Access denied');
  }

  if (!access) {
    throw new AppError(403, 'Access denied');
  }

  return withPhotoUploadCapability(
    await withSignedMemorialPhoto(memorial),
    canViewerUploadPhotos(memorial, userId)
  );
}

export async function getMemorialByAccessToken(accessToken: string, userId?: string) {
  const access = await prisma.memorialAccess.findUnique({
    where: { accessToken },
    include: { memorial: true },
  });

  if (!access) {
    throw new AppError(404, 'Memorial not found');
  }

  return {
    memorial: withPhotoUploadCapability(
      await withSignedMemorialPhoto(access.memorial),
      canViewerUploadPhotos(access.memorial, userId)
    ),
    permission: access.permission,
  };
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
    allowPhotoUploads?: boolean;
    category?: 'STARS_PUBLIC_FIGURES' | 'CHILDREN' | 'ILLNESSES' | 'CREATORS_INSPIRATIONS_PIONEERS' | 'EVERYDAY_HEROES' | 'VICTIMS_OF_EVENTS' | 'MISSING_PERSONS' | 'SUICIDE' | 'ELDERLY' | 'OTHER';
    subcategory?: string | null;
  }
) {
  await assertAdminAccess(memorialId, userId);

  const memorial = await prisma.memorial.update({
    where: { id: memorialId },
    data: {
      ...data,
      subcategory: data.subcategory !== undefined ? (data.subcategory as any) : undefined,
    },
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

  return withPhotoUploadCapability(
    await withSignedMemorialPhoto(memorial),
    canViewerUploadPhotos(memorial, userId)
  );
}

export async function updateMemorialPhoto(
  memorialId: string,
  userId: string,
  photoUrl: string
) {
  await assertAdminAccess(memorialId, userId);
  const memorial = await prisma.memorial.update({
    where: { id: memorialId },
    data: { profilePhotoUrl: photoUrl },
  });

  return withPhotoUploadCapability(
    await withSignedMemorialPhoto(memorial),
    canViewerUploadPhotos(memorial, userId)
  );
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

  const existing = await prisma.memorialAccess.findFirst({
    where: {
      id: accessId,
      memorialId,
    },
  });

  if (!existing) {
    throw new AppError(404, 'Access record not found for this memorial');
  }

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

  const existing = await prisma.memorialAccess.findFirst({
    where: {
      id: accessId,
      memorialId,
    },
  });

  if (!existing) {
    throw new AppError(404, 'Access record not found for this memorial');
  }

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

export async function assertOwnerAccess(memorialId: string, userId: string) {
  const memorial = await prisma.memorial.findUnique({
    where: { id: memorialId },
  });

  if (!memorial) {
    throw new AppError(404, 'Memorial not found');
  }

  if (memorial.ownerId !== userId) {
    throw new AppError(403, 'Only the memorial owner can perform this action');
  }
}

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

export async function assertPhotoUploadAllowed(
  memorialId: string,
  userId: string,
  accessToken?: string
) {
  const memorial = await prisma.memorial.findUnique({
    where: { id: memorialId },
  });

  if (!memorial) {
    throw new AppError(404, 'Memorial not found');
  }

  if (memorial.ownerId === userId) return;

  if (!memorial.allowPhotoUploads) {
    throw new AppError(403, 'Photo uploads are disabled for this memorial');
  }

  if (memorial.privacyLevel === 'PUBLIC') {
    return;
  }

  const access = await prisma.memorialAccess.findFirst({
    where: {
      memorialId,
      userId,
    },
  });

  if (!access) {
    if (!accessToken) {
      throw new AppError(403, 'Access denied');
    }

    const sharedAccess = await prisma.memorialAccess.findFirst({
      where: {
        memorialId,
        accessToken,
      },
    });

    if (!sharedAccess) {
      throw new AppError(403, 'Access denied');
    }
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
