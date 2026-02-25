// ── Enums ──

export const PrivacyLevel = {
  PRIVATE: 'PRIVATE',
  SHARED_LINK: 'SHARED_LINK',
  PUBLIC: 'PUBLIC',
} as const;
export type PrivacyLevel = (typeof PrivacyLevel)[keyof typeof PrivacyLevel];

export const MemoryType = {
  PHOTO: 'PHOTO',
  TEXT: 'TEXT',
  TRIBUTE: 'TRIBUTE',
  QUOTE: 'QUOTE',
} as const;
export type MemoryType = (typeof MemoryType)[keyof typeof MemoryType];

export const Permission = {
  VIEW: 'VIEW',
  CONTRIBUTE: 'CONTRIBUTE',
  ADMIN: 'ADMIN',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

export const InteractionType = {
  MESSAGE: 'MESSAGE',
  CANDLE: 'CANDLE',
  REACTION: 'REACTION',
} as const;
export type InteractionType =
  (typeof InteractionType)[keyof typeof InteractionType];

export const ALLOWED_REACTIONS = ['🤍', '🌿'] as const;
export type AllowedReaction = (typeof ALLOWED_REACTIONS)[number];

export const MemorialCategory = {
  IN_LOVING_MEMORY: 'IN_LOVING_MEMORY',
  TRIBUTE: 'TRIBUTE',
  LIFE_STORY: 'LIFE_STORY',
  OBITUARY: 'OBITUARY',
  COMMUNITY: 'COMMUNITY',
  OTHER: 'OTHER',
} as const;
export type MemorialCategory =
  (typeof MemorialCategory)[keyof typeof MemorialCategory];

// ── Entity Interfaces ──

export interface User {
  id: string;
  email: string;
  displayName: string;
  profilePhotoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** BE-only: includes passwordHash */
export interface UserWithPassword extends User {
  passwordHash: string;
}

export interface Memorial {
  id: string;
  ownerId: string;
  fullName: string;
  dateOfBirth: string;
  dateOfPassing: string;
  biography: string | null;
  profilePhotoUrl: string | null;
  privacyLevel: PrivacyLevel;
  category: MemorialCategory;
  createdAt: string;
  updatedAt: string;
}

export interface LifeMoment {
  id: string;
  memorialId: string;
  title: string;
  description: string | null;
  date: string;
  sortOrder: number;
  createdAt: string;
}

export interface Memory {
  id: string;
  memorialId: string;
  authorId: string;
  type: MemoryType;
  content: string | null;
  mediaUrl: string | null;
  createdAt: string;
  author?: { id: string; displayName: string };
}

export interface MemorialAccess {
  id: string;
  memorialId: string;
  userId: string | null;
  email: string | null;
  accessToken: string | null;
  permission: Permission;
  createdAt: string;
}

export interface VisitorInteraction {
  id: string;
  memorialId: string;
  visitorId: string | null;
  type: InteractionType;
  content: string | null;
  reactionEmoji: AllowedReaction | null;
  createdAt: string;
  visitor?: { id: string; displayName: string } | null;
}

export interface MemorialStats {
  totalMemories: number;
  totalCandles: number;
  totalMessages: number;
  totalVisitors: number;
}
