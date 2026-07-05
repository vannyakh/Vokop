import { z } from 'zod';
import { videoProbeResponseSchema } from './video.js';

export const jobStatusSchema = z.enum(['queued', 'processing', 'completed', 'failed']);

export const videoSessionResponseSchema = z.object({
  sessionId: z.string(),
  filename: z.string(),
  size: z.number().int().nonnegative(),
  probe: videoProbeResponseSchema,
  expiresAt: z.string().datetime(),
});

export const videoJobResponseSchema = z.object({
  jobId: z.string(),
  type: z.enum(['filmstrip', 'probe', 'export']),
  status: jobStatusSchema,
  progress: z.number().min(0).max(100),
  sessionId: z.string().optional(),
  thumbnails: z.array(z.string()).optional(),
  result: videoProbeResponseSchema.optional(),
  error: z.string().optional(),
  /** Set once an `export` job completes — relative API path to download the rendered file. */
  downloadUrl: z.string().optional(),
  /** Output container/extension for the finished export (e.g. `mp4`, `mp3`). */
  outputFormat: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const startFilmstripJobResponseSchema = z.object({
  jobId: z.string(),
  status: jobStatusSchema,
});

export type JobStatus = z.infer<typeof jobStatusSchema>;
export type VideoSessionResponse = z.infer<typeof videoSessionResponseSchema>;
export type VideoJobResponse = z.infer<typeof videoJobResponseSchema>;
