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

export const exportComposedAudioClipSchema = z.object({
  id: z.string(),
  start: z.number(),
  duration: z.number(),
  sourceStart: z.number(),
  muted: z.boolean().optional(),
  volume: z.number().optional(),
  linkedVideoClipId: z.string().optional(),
});

export const exportComposedAudioSnapshotSchema = z.object({
  sessionId: z.string().optional(),
  originalVolume: z.number().min(0).max(2).default(1),
  voiceVolume: z.number().min(0).max(2).default(1),
  includeOriginalAudio: z.boolean(),
  includeVoiceover: z.boolean(),
  audioClips: z.array(exportComposedAudioClipSchema).default([]),
  videoClips: z.array(exportComposedAudioClipSchema).default([]),
});

/** Metadata for WebCodecs composed video + server-side session audio mux. */
export const exportComposedRenderMetaSchema = z.object({
  settings: exportRenderSettingsSchema,
  fps: z.number().int().positive(),
  audioSnapshot: exportComposedAudioSnapshotSchema,
});

export const startExportRenderResponseSchema = z.object({
  jobId: z.string(),
  status: jobStatusSchema,
});

export type ExportRenderSettings = z.infer<typeof exportRenderSettingsSchema>;
export type ExportComposedAudioSnapshot = z.infer<typeof exportComposedAudioSnapshotSchema>;
export type ExportComposedRenderMeta = z.infer<typeof exportComposedRenderMetaSchema>;
export type StartExportRenderResponse = z.infer<typeof startExportRenderResponseSchema>;
