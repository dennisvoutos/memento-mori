// Types
export type {
  User,
  UserWithPassword,
  Memorial,
  LifeMoment,
  Memory,
  MemorialAccess,
  VisitorInteraction,
  MemorialStats,
  AllowedReaction,
} from './types.js';

export {
  PrivacyLevel,
  MemoryType,
  Permission,
  InteractionType,
  ALLOWED_REACTIONS,
} from './types.js';

// Schemas
export {
  // Enum schemas
  privacyLevelSchema,
  memoryTypeSchema,
  permissionSchema,
  interactionTypeSchema,
  reactionEmojiSchema,

  // Auth
  registerSchema,
  loginSchema,
  registerFormSchema,
  authResponseSchema,

  // Memorial
  createMemorialSchema,
  updateMemorialSchema,
  memorialResponseSchema,

  // Life Moments
  createLifeMomentSchema,
  updateLifeMomentSchema,
  reorderLifeMomentsSchema,

  // Memories
  createMemorySchema,

  // Access
  createAccessSchema,
  updateAccessSchema,

  // Interactions
  createInteractionSchema,

  // Stats
  memorialStatsSchema,

  // Pagination
  paginationQuerySchema,
  paginatedResponseSchema,

  // Errors
  apiErrorSchema,
} from './schemas.js';

// Schema types
export type {
  RegisterInput,
  LoginInput,
  RegisterFormInput,
  AuthResponse,
  CreateMemorialInput,
  UpdateMemorialInput,
  MemorialResponse,
  CreateLifeMomentInput,
  UpdateLifeMomentInput,
  ReorderLifeMomentsInput,
  CreateMemoryInput,
  CreateAccessInput,
  UpdateAccessInput,
  CreateInteractionInput,
  MemorialStatsResponse,
  PaginationQuery,
  ApiError,
} from './schemas.js';
