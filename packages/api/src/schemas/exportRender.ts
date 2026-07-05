import { z } from 'zod';
import { jobStatusSchema } from './jobs.js';

/** Settings for the local-render "Export Video" flow (see video-tools `/export/render`). */
export const exportRenderSettingsSchema = z.object({
  exportType: z.enum(['video', 'audio']),
  format: z.enum(['mp4', 'webm', 'mp3', 'wav', 'aac']),
  codec: z.enum(['h264', 'h265', 'vp9']).optional(),
  quality: z.enum(['ultra', 'high', 'medium', 'low']),
  removeWatermark: z.boolean(),
  rangeInSec: z.number().nonnegative(),
  rangeOutSec: z.number().positive(),
});

export const startExportRenderResponseSchema = z.object({
  jobId: z.string(),
  status: jobStatusSchema,
});

export type ExportRenderSettings = z.infer<typeof exportRenderSettingsSchema>;
export type StartExportRenderResponse = z.infer<typeof startExportRenderResponseSchema>;
