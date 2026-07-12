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
  STARS_PUBLIC_FIGURES: 'STARS_PUBLIC_FIGURES',
  CHILDREN: 'CHILDREN',
  ILLNESSES: 'ILLNESSES',
  CREATORS_INSPIRATIONS_PIONEERS: 'CREATORS_INSPIRATIONS_PIONEERS',
  EVERYDAY_HEROES: 'EVERYDAY_HEROES',
  VICTIMS_OF_EVENTS: 'VICTIMS_OF_EVENTS',
  MISSING_PERSONS: 'MISSING_PERSONS',
  SUICIDE: 'SUICIDE',
  ELDERLY: 'ELDERLY',
  OTHER: 'OTHER',
} as const;
export type MemorialCategory =
  (typeof MemorialCategory)[keyof typeof MemorialCategory];

export const MemorialSubcategory = {
  // Illnesses
  HEART_DISEASE: 'HEART_DISEASE',
  CANCER: 'CANCER',
  COVID_19: 'COVID_19',
  STROKE: 'STROKE',
  RESPIRATORY_DISEASE: 'RESPIRATORY_DISEASE',
  ALZHEIMERS_DEMENTIA: 'ALZHEIMERS_DEMENTIA',
  DIABETES: 'DIABETES',
  KIDNEY_DISEASE: 'KIDNEY_DISEASE',
  RARE_DISEASE: 'RARE_DISEASE',
  CHRONIC_ILLNESS: 'CHRONIC_ILLNESS',
  // Victims of Events
  ACCIDENT_ROAD: 'ACCIDENT_ROAD',
  ACCIDENT_WORKPLACE: 'ACCIDENT_WORKPLACE',
  FIRE: 'FIRE',
  NATURAL_DISASTER: 'NATURAL_DISASTER',
  ATTACK: 'ATTACK',
  CRIME: 'CRIME',
  FEMICIDE: 'FEMICIDE',
  // Stars / Public Figures
  LOCAL_CELEBRITY: 'LOCAL_CELEBRITY',
  ACTOR: 'ACTOR',
  ATHLETE: 'ATHLETE',
  MUSICIAN: 'MUSICIAN',
  MEDIA_PERSONALITY: 'MEDIA_PERSONALITY',
  INFLUENCER: 'INFLUENCER',
  POLITICAL_LEADER: 'POLITICAL_LEADER',
  // Everyday Heroes
  FIREFIGHTER: 'FIREFIGHTER',
  MILITARY: 'MILITARY',
  POLICE: 'POLICE',
  HEALTHCARE_WORKER: 'HEALTHCARE_WORKER',
  JOURNALIST: 'JOURNALIST',
  VOLUNTEER: 'VOLUNTEER',
  // Creators / Inspirations / Pioneers
  ARTIST: 'ARTIST',
  WRITER: 'WRITER',
  ARTISAN: 'ARTISAN',
  INNOVATOR: 'INNOVATOR',
  SCIENTIST: 'SCIENTIST',
  THINKER: 'THINKER',
  // Children
  CHILD_DECEASED: 'CHILD_DECEASED',
  STILLBORN_INFANT: 'STILLBORN_INFANT',
  // Missing Persons
  ONGOING_SEARCH: 'ONGOING_SEARCH',
  // Elderly
  AGE_RELATED: 'AGE_RELATED',
  NATURAL_CAUSES: 'NATURAL_CAUSES',
} as const;
export type MemorialSubcategory =
  (typeof MemorialSubcategory)[keyof typeof MemorialSubcategory];

// ── Entity Interfaces ──

export interface User {
  id: string;
  email: string;
  displayName: string;
  profilePhotoUrl: string | null;
  emailVerified: boolean;
  hasPassword: boolean;
  isGoogleConnected: boolean;
  isAppleConnected: boolean;
  isGooglePhotosConnected: boolean;
  acceptedTermsVersion: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LinkedAccount {
  provider: 'GOOGLE' | 'APPLE';
  email: string | null;
  linkedAt: string;
}

export interface ConnectedServiceInfo {
  id: string;
  provider: 'GOOGLE_PHOTOS' | 'ICLOUD_PHOTOS';
  scopes: string | null;
  linkedAt: string;
  expiresAt: string | null;
}

export type AuthProvider = 'GOOGLE' | 'APPLE';

/** BE-only: includes passwordHash */
export interface UserWithPassword extends User {
  passwordHash: string | null;
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
  allowPhotoUploads: boolean;
  category: MemorialCategory;
  subcategory: MemorialSubcategory | null;
  canUploadPhotos?: boolean;
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
  caption: string | null;
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
