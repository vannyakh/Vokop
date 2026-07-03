import { z } from 'zod';

// ─── Ingest ───────────────────────────────────────────────────────────────────

/** Emitted after a client completes a direct-to-R2 upload. */
export const ingestPayloadSchema = z.object({
  assetId: z.string(),
  projectId: z.string(),
  ownerId: z.string(),
  r2Key: z.string(),
  filename: z.string(),
  kind: z.enum(['video', 'audio', 'image']),
  size: z.number(),
});

export type IngestPayload = z.infer<typeof ingestPayloadSchema>;

// ─── Render ───────────────────────────────────────────────────────────────────

const exportSettingsSchema = z.object({
  format: z.enum(['mp4', 'webm']).default('mp4'),
  resolution: z.enum(['1080p', '720p', '480p', 'original']).default('1080p'),
  fps: z.number().min(1).max(120).default(30),
});

export const renderPayloadSchema = z.object({
  jobId: z.string(),
  projectId: z.string(),
  ownerId: z.string(),
  timelineSnapshot: z.record(z.unknown()),
  exportSettings: exportSettingsSchema,
});

export type RenderPayload = z.infer<typeof renderPayloadSchema>;
export type ExportSettings = z.infer<typeof exportSettingsSchema>;

// ─── AI ───────────────────────────────────────────────────────────────────────

export const aiPayloadSchema = z.discriminatedUnion('task', [
  z.object({
    task: z.literal('transcribe'),
    jobId: z.string(),
    projectId: z.string(),
    ownerId: z.string(),
    r2Key: z.string(),
    language: z.string().optional(),
    hotwords: z.string().optional(),
  }),
  z.object({
    task: z.literal('tts'),
    jobId: z.string(),
    projectId: z.string(),
    ownerId: z.string(),
    text: z.string(),
    voice: z.string().default('en-US-Standard-A'),
    outputR2Key: z.string(),
  }),
  z.object({
    task: z.literal('translate'),
    jobId: z.string(),
    projectId: z.string(),
    ownerId: z.string(),
    segments: z.array(z.object({ start: z.number(), end: z.number(), text: z.string() })),
    targetLanguage: z.string(),
  }),
]);

export type AiPayload = z.infer<typeof aiPayloadSchema>;
