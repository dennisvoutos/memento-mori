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
  ALLOWED_SIGNUP_EMAIL_PROVIDERS,
  getSignupEmailProviderWarning,
  isAllowedSignupEmailProvider,
  UNSUPPORTED_SIGNUP_EMAIL_PROVIDER_MESSAGE,
} from './email-providers.js';

export {
  PrivacyLevel,
  MemoryType,
  Permission,
  InteractionType,
  ALLOWED_REACTIONS,
  MemorialCategory,
  MemorialSubcategory,
} from './types.js';

// Schemas
export {
  // Enum schemas
  privacyLevelSchema,
  memoryTypeSchema,
  permissionSchema,
  interactionTypeSchema,
  reactionEmojiSchema,
  memorialCategorySchema,
  memorialSubcategorySchema,

  // Auth
  TERMS_ACCEPTANCE_MESSAGE,
  registerSchema,
  loginSchema,
  resendVerificationSchema,
  verifyEmailQuerySchema,
  registerFormSchema,
  authResponseSchema,

  // Password Reset
  forgotPasswordSchema,
  resetPasswordTokenQuerySchema,
  resetPasswordSchema,

  // Profile
  updateProfileSchema,
  changePasswordSchema,

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
  ResendVerificationInput,
  VerifyEmailQueryInput,
  RegisterFormInput,
  AuthResponse,
  UpdateProfileInput,
  ChangePasswordInput,

  // Password Reset
  ForgotPasswordInput,
  ResetPasswordTokenQueryInput,
  ResetPasswordInput,

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
