import { z } from 'zod';

export const apiErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
});

export const databaseHealthSchema = z.object({
  mongo: z.boolean(),
  redis: z.boolean(),
});

export const serviceStatusSchema = z.enum(['ok', 'degraded']);

export type ApiError = z.infer<typeof apiErrorSchema>;
export type DatabaseHealth = z.infer<typeof databaseHealthSchema>;
