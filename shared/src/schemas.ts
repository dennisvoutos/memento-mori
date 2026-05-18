import { z } from 'zod';

// ── Enum schemas ──

export const privacyLevelSchema = z.enum(['PRIVATE', 'SHARED_LINK', 'PUBLIC']);
export const memoryTypeSchema = z.enum(['PHOTO', 'TEXT', 'TRIBUTE', 'QUOTE']);
export const permissionSchema = z.enum(['VIEW', 'CONTRIBUTE', 'ADMIN']);
export const interactionTypeSchema = z.enum(['MESSAGE', 'CANDLE', 'REACTION']);
export const reactionEmojiSchema = z.enum(['🤍', '🌿']);
export const memorialCategorySchema = z.enum([
  'STARS_PUBLIC_FIGURES',
  'CHILDREN',
  'ILLNESSES',
  'CREATORS_INSPIRATIONS_PIONEERS',
  'EVERYDAY_HEROES',
  'VICTIMS_OF_EVENTS',
  'MISSING_PERSONS',
  'SUICIDE',
  'ELDERLY',
  'OTHER',
]);

export const memorialSubcategorySchema = z.enum([
  // Illnesses
  'HEART_DISEASE',
  'CANCER',
  'COVID_19',
  'STROKE',
  'RESPIRATORY_DISEASE',
  'ALZHEIMERS_DEMENTIA',
  'DIABETES',
  'KIDNEY_DISEASE',
  'RARE_DISEASE',
  'CHRONIC_ILLNESS',
  // Victims of Events
  'ACCIDENT_ROAD',
  'ACCIDENT_WORKPLACE',
  'FIRE',
  'NATURAL_DISASTER',
  'ATTACK',
  'CRIME',
  'FEMICIDE',
  // Stars / Public Figures
  'LOCAL_CELEBRITY',
  'ACTOR',
  'ATHLETE',
  'MUSICIAN',
  'MEDIA_PERSONALITY',
  'INFLUENCER',
  'POLITICAL_LEADER',
  // Everyday Heroes
  'FIREFIGHTER',
  'MILITARY',
  'POLICE',
  'HEALTHCARE_WORKER',
  'JOURNALIST',
  'VOLUNTEER',
  // Creators / Inspirations / Pioneers
  'ARTIST',
  'WRITER',
  'ARTISAN',
  'INNOVATOR',
  'SCIENTIST',
  'THINKER',
  // Children
  'CHILD_DECEASED',
  'STILLBORN_INFANT',
  // Missing Persons
  'ONGOING_SEARCH',
  // Elderly
  'AGE_RELATED',
  'NATURAL_CAUSES',
]);

// ── Auth Schemas ──

export const registerSchema = z.object({
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be 100 characters or less'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be 128 characters or less'),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerFormSchema = registerSchema
  .extend({
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type RegisterFormInput = z.infer<typeof registerFormSchema>;

// ── Auth Response ──

export const authResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    displayName: z.string(),
    profilePhotoUrl: z.string().nullable(),
    hasPassword: z.boolean(),
    isGoogleConnected: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

// ── Profile Schemas ──

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be 100 characters or less'),
  email: z.string().email('Invalid email address'),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'New password must be 128 characters or less'),
  confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Passwords do not match',
  path: ['confirmNewPassword'],
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ── Date helpers ──

/** YYYY-MM-DD string that must parse to a real date, no earlier than 1800 */
const isoDateString = (label: string) =>
  z.string().min(1, `${label} is required`).refine(
    (v) => !isNaN(Date.parse(v)),
    { message: `${label} must be a valid date` },
  ).refine(
    (v) => {
      const d = new Date(v);
      return !isNaN(d.getTime()) && d.getFullYear() >= 1800;
    },
    { message: `${label} must be no earlier than the year 1800` },
  );

// ── Memorial Schemas ──

export const createMemorialSchema = z.object({
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .max(200, 'Full name must be 200 characters or less'),
  dateOfBirth: isoDateString('Date of birth'),
  dateOfPassing: isoDateString('Date of passing'),
  biography: z
    .string()
    .max(5000, 'Biography must be 5000 characters or less')
    .nullable()
    .optional(),
  privacyLevel: privacyLevelSchema.default('PRIVATE'),
  allowPhotoUploads: z.boolean().default(false),
  category: memorialCategorySchema.default('OTHER'),
  subcategory: memorialSubcategorySchema.nullable().optional(),
}).refine(
  (data) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return new Date(data.dateOfBirth) <= today;
  },
  { message: 'Date of birth cannot be in the future', path: ['dateOfBirth'] },
).refine(
  (data) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return new Date(data.dateOfPassing) <= today;
  },
  { message: 'Date of passing cannot be in the future', path: ['dateOfPassing'] },
).refine(
  (data) => new Date(data.dateOfPassing) >= new Date(data.dateOfBirth),
  { message: 'Date of passing cannot be before date of birth', path: ['dateOfPassing'] },
);
export type CreateMemorialInput = z.infer<typeof createMemorialSchema>;

export const updateMemorialSchema = z.object({
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .max(200, 'Full name must be 200 characters or less')
    .optional(),
  dateOfBirth: isoDateString('Date of birth').optional(),
  dateOfPassing: isoDateString('Date of passing').optional(),
  biography: z
    .string()
    .max(5000, 'Biography must be 5000 characters or less')
    .nullable()
    .optional(),
  privacyLevel: privacyLevelSchema.optional(),
  allowPhotoUploads: z.boolean().optional(),
  category: memorialCategorySchema.optional(),
  subcategory: memorialSubcategorySchema.nullable().optional(),
}).refine(
  (data) => {
    if (!data.dateOfBirth) return true;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return new Date(data.dateOfBirth) <= today;
  },
  { message: 'Date of birth cannot be in the future', path: ['dateOfBirth'] },
).refine(
  (data) => {
    if (!data.dateOfPassing) return true;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return new Date(data.dateOfPassing) <= today;
  },
  { message: 'Date of passing cannot be in the future', path: ['dateOfPassing'] },
).refine(
  (data) => {
    if (!data.dateOfPassing || !data.dateOfBirth) return true;
    return new Date(data.dateOfPassing) >= new Date(data.dateOfBirth);
  },
  { message: 'Date of passing cannot be before date of birth', path: ['dateOfPassing'] },
);
export type UpdateMemorialInput = z.infer<typeof updateMemorialSchema>;

export const memorialResponseSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  fullName: z.string(),
  dateOfBirth: z.string(),
  dateOfPassing: z.string(),
  biography: z.string().nullable(),
  profilePhotoUrl: z.string().nullable(),
  privacyLevel: privacyLevelSchema,
  allowPhotoUploads: z.boolean(),
  category: memorialCategorySchema,
  subcategory: memorialSubcategorySchema.nullable(),
  canUploadPhotos: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MemorialResponse = z.infer<typeof memorialResponseSchema>;

// ── Life Moment Schemas ──

export const createLifeMomentSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .nullable()
    .optional(),
  date: z.string().min(1, 'Date is required'),
  sortOrder: z.number().int().min(0).optional(),
});
export type CreateLifeMomentInput = z.infer<typeof createLifeMomentSchema>;

export const updateLifeMomentSchema = createLifeMomentSchema.partial();
export type UpdateLifeMomentInput = z.infer<typeof updateLifeMomentSchema>;

export const reorderLifeMomentsSchema = z.object({
  moments: z.array(
    z.object({
      id: z.string(),
      sortOrder: z.number().int().min(0),
    })
  ),
});
export type ReorderLifeMomentsInput = z.infer<typeof reorderLifeMomentsSchema>;

// ── Memory Schemas ──

export const createMemorySchema = z.object({
  type: z.enum(['TEXT', 'TRIBUTE', 'QUOTE']),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(5000, 'Content must be 5000 characters or less'),
});
export type CreateMemoryInput = z.infer<typeof createMemorySchema>;

// ── Memorial Access Schemas ──

export const createAccessSchema = z.object({
  email: z.string().email('Invalid email address'),
  permission: permissionSchema,
});
export type CreateAccessInput = z.infer<typeof createAccessSchema>;

export const updateAccessSchema = z.object({
  permission: permissionSchema,
});
export type UpdateAccessInput = z.infer<typeof updateAccessSchema>;

// ── Visitor Interaction Schemas ──

export const createInteractionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('MESSAGE'),
    content: z
      .string()
      .min(1, 'Message is required')
      .max(500, 'Message must be 500 characters or less'),
  }),
  z.object({
    type: z.literal('CANDLE'),
  }),
  z.object({
    type: z.literal('REACTION'),
    reactionEmoji: reactionEmojiSchema,
  }),
]);
export type CreateInteractionInput = z.infer<typeof createInteractionSchema>;

// ── Stats Schema ──

export const memorialStatsSchema = z.object({
  totalMemories: z.number(),
  totalCandles: z.number(),
  totalMessages: z.number(),
  totalVisitors: z.number(),
});
export type MemorialStatsResponse = z.infer<typeof memorialStatsSchema>;

// ── Pagination ──

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  });

// ── API Error ──

export const apiErrorSchema = z.object({
  message: z.string(),
  errors: z
    .array(
      z.object({
        field: z.string().optional(),
        message: z.string(),
      })
    )
    .optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
