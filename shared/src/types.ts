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

// ── Entity Interfaces ──

export interface User {
  id: string;
  email: string;
  displayName: string;
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
}

export interface MemorialStats {
  totalMemories: number;
  totalCandles: number;
  totalMessages: number;
  totalVisitors: number;
}
