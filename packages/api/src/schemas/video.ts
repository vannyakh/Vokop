import { z } from 'zod';

export const videoProbeResponseSchema = z.object({
  duration: z.number().nonnegative(),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  codec: z.string().nullable(),
  fps: z.number().nullable(),
});

export const filmstripResponseSchema = z.object({
  thumbnails: z.array(z.string()),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const filmstripRequestSchema = z.object({
  duration: z.number().positive(),
});

export const videoJobSchema = z.object({
  type: z.enum(['probe', 'filmstrip']),
  filename: z.string(),
  size: z.number().int().nonnegative(),
  status: z.enum(['completed', 'failed']),
  meta: z.record(z.unknown()).optional(),
  createdAt: z.coerce.date(),
});

export type VideoProbeResponse = z.infer<typeof videoProbeResponseSchema>;
export type FilmstripResponse = z.infer<typeof filmstripResponseSchema>;
export type FilmstripRequest = z.infer<typeof filmstripRequestSchema>;
export type VideoJob = z.infer<typeof videoJobSchema>;
