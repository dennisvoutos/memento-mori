import { z } from 'zod';

export const publicStatsResponseSchema = z.object({
  memorialCount: z.number().int().nonnegative(),
  candleCount: z.number().int().nonnegative(),
  messageCount: z.number().int().nonnegative(),
});

export type PublicStatsResponse = z.infer<typeof publicStatsResponseSchema>;
