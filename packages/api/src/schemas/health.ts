import { z } from 'zod';
import { databaseHealthSchema, serviceStatusSchema } from './common.js';

export const healthResponseSchema = z.object({
  status: serviceStatusSchema,
  service: z.string(),
  databases: databaseHealthSchema,
  timestamp: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type VideoToolsHealthResponse = z.infer<typeof videoToolsHealthResponseSchema>;

export const gatewayHealthResponseSchema = healthResponseSchema.extend({
  service: z.literal('gateway'),
});

export const ffmpegHealthSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
});

export type FfmpegHealth = z.infer<typeof ffmpegHealthSchema>;

export const videoToolsHealthResponseSchema = healthResponseSchema.extend({
  service: z.literal('video-tools'),
  ffmpeg: ffmpegHealthSchema.optional(),
});
