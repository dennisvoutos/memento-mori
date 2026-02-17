import { z } from 'zod';

// ── Enum schemas ──

export const privacyLevelSchema = z.enum(['PRIVATE', 'SHARED_LINK', 'PUBLIC']);
export const memoryTypeSchema = z.enum(['PHOTO', 'TEXT', 'TRIBUTE', 'QUOTE']);
export const permissionSchema = z.enum(['VIEW', 'CONTRIBUTE', 'ADMIN']);
export const interactionTypeSchema = z.enum(['MESSAGE', 'CANDLE', 'REACTION']);
export const reactionEmojiSchema = z.enum(['🤍', '🌿']);

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
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

// ── Memorial Schemas ──

export const createMemorialSchema = z.object({
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .max(200, 'Full name must be 200 characters or less'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  dateOfPassing: z.string().min(1, 'Date of passing is required'),
  biography: z
    .string()
    .max(5000, 'Biography must be 5000 characters or less')
    .nullable()
    .optional(),
  privacyLevel: privacyLevelSchema.default('PRIVATE'),
});
export type CreateMemorialInput = z.infer<typeof createMemorialSchema>;

export const updateMemorialSchema = createMemorialSchema.partial();
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
