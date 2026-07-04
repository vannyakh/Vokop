import { z } from 'zod';
import { jobStatusSchema } from './jobs.js';

/** Registered LLM backends in services/ai-content. */
export const llmProviderIdSchema = z.enum(['gemini', 'openai', 'claude', '302ai']);

export const llmProviderRefSchema = z.object({
  provider: llmProviderIdSchema.optional(),
  model: z.string().min(1).optional(),
});

export const transcriptSegmentSchema = z.object({
  startSec: z.number().nonnegative(),
  endSec: z.number().nonnegative(),
  text: z.string(),
  speakerId: z.string().optional(),
});

export const clipRangeSchema = z.object({
  startSec: z.number().nonnegative(),
  endSec: z.number().nonnegative(),
  title: z.string().optional(),
  reason: z.string().optional(),
});

export const aiJobTypeSchema = z.enum([
  'transcribe',
  'subtitles',
  'clip-suggest',
  'agent',
  'llm',
  'translate',
  'image',
  'voice',
  'text',
  'analyze',
]);

export const aiFeatureSchema = z.enum([
  'text',
  'translate',
  'transcript',
  'image',
  'voice',
  'agent',
  'clips',
  'analyze',
]);

export const startAiJobResponseSchema = z.object({
  jobId: z.string(),
  type: aiJobTypeSchema,
  status: jobStatusSchema,
});

export const aiJobResponseSchema = z.object({
  jobId: z.string(),
  type: aiJobTypeSchema,
  status: jobStatusSchema,
  progress: z.number().min(0).max(100),
  sessionId: z.string().optional(),
  projectId: z.string().optional(),
  segments: z.array(transcriptSegmentSchema).optional(),
  transcript: z.string().optional(),
  srt: z.string().optional(),
  clips: z.array(clipRangeSchema).optional(),
  message: z.string().optional(),
  audioBase64: z.string().optional(),
  actions: z
    .array(
      z.object({
        type: z.string(),
        payload: z.record(z.unknown()).optional(),
      }),
    )
    .optional(),
  result: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const transcribeRequestSchema = z
  .object({
    sessionId: z.string().optional(),
    projectId: z.string().optional(),
    r2Key: z.string().optional(),
    language: z.string().optional(),
    hotwords: z.string().optional(),
    /** Base64 media when session/r2 is not available (dev / small clips). */
    mediaBase64: z.string().optional(),
    mimeType: z.string().optional(),
    durationSec: z.number().positive().optional(),
  })
  .merge(llmProviderRefSchema);

export const subtitlesRequestSchema = z.object({
  segments: z.array(transcriptSegmentSchema).min(1),
  format: z.enum(['srt', 'vtt']).default('srt'),
});

export const subtitlesResponseSchema = z.object({
  format: z.enum(['srt', 'vtt']),
  content: z.string(),
  segments: z.array(transcriptSegmentSchema),
});

export const clipSuggestRequestSchema = z
  .object({
    transcript: z.string().min(1),
    segments: z.array(transcriptSegmentSchema).optional(),
    prompt: z.string().optional(),
    maxClips: z.number().int().min(1).max(20).default(5),
    projectId: z.string().optional(),
  })
  .merge(llmProviderRefSchema);

export const clipSuggestResponseSchema = z.object({
  clips: z.array(clipRangeSchema),
  summary: z.string().optional(),
});

export const llmCompleteRequestSchema = z
  .object({
    prompt: z.string().min(1),
    system: z.string().optional(),
    json: z.boolean().optional(),
    temperature: z.number().min(0).max(2).optional(),
  })
  .merge(llmProviderRefSchema);

export const llmCompleteResponseSchema = z.object({
  text: z.string(),
  model: z.string(),
  provider: llmProviderIdSchema,
});

export const llmProviderInfoSchema = z.object({
  id: llmProviderIdSchema,
  name: z.string(),
  configured: z.boolean(),
  defaultModel: z.string(),
  models: z.array(z.string()),
  supportsMedia: z.boolean(),
});

export const llmProvidersResponseSchema = z.object({
  defaultProvider: llmProviderIdSchema,
  providers: z.array(llmProviderInfoSchema),
});

export const agentRunRequestSchema = z
  .object({
    message: z.string().min(1),
    projectId: z.string().optional(),
    sessionId: z.string().optional(),
    transcript: z.string().optional(),
    segments: z.array(transcriptSegmentSchema).optional(),
    context: z.record(z.unknown()).optional(),
  })
  .merge(llmProviderRefSchema);

export const agentRunResponseSchema = z.object({
  message: z.string(),
  actions: z.array(
    z.object({
      type: z.string(),
      payload: z.record(z.unknown()).optional(),
    }),
  ),
  clips: z.array(clipRangeSchema).optional(),
});

/** Translate free text or timed caption segments. */
export const translateRequestSchema = z
  .object({
    targetLanguage: z.string().min(1),
    sourceLanguage: z.string().optional(),
    text: z.string().optional(),
    segments: z.array(transcriptSegmentSchema).optional(),
    projectId: z.string().optional(),
  })
  .merge(llmProviderRefSchema)
  .refine((v) => Boolean(v.text?.trim()) || Boolean(v.segments?.length), {
    message: 'Provide text or segments',
  });

export const translateResponseSchema = z.object({
  targetLanguage: z.string(),
  sourceLanguage: z.string().optional(),
  translatedText: z.string(),
  segments: z.array(transcriptSegmentSchema).optional(),
  provider: llmProviderIdSchema.optional(),
  model: z.string().optional(),
});

/** Image describe / OCR / caption suggestion. */
export const imageAnalyzeRequestSchema = z
  .object({
    imageBase64: z.string().min(1),
    mimeType: z.string().min(1),
    task: z.enum(['describe', 'ocr', 'caption']).default('describe'),
    prompt: z.string().optional(),
  })
  .merge(llmProviderRefSchema);

export const imageAnalyzeResponseSchema = z.object({
  description: z.string(),
  ocrText: z.string().optional(),
  labels: z.array(z.string()).default([]),
  objects: z.array(z.string()).optional(),
  captionSuggestion: z.string().optional(),
  provider: llmProviderIdSchema.optional(),
  model: z.string().optional(),
});

/** Text-to-speech (OpenAI-compatible via 302.AI or OpenAI). */
export const voiceTtsRequestSchema = z
  .object({
    text: z.string().min(1),
    voice: z.string().optional(),
    format: z.enum(['mp3', 'wav', 'opus']).default('mp3'),
  })
  .merge(llmProviderRefSchema);

export const voiceTtsResponseSchema = z.object({
  audioBase64: z.string(),
  mimeType: z.string(),
  format: z.enum(['mp3', 'wav', 'opus']),
  voice: z.string(),
  model: z.string(),
  provider: llmProviderIdSchema,
});

/** Text assist for captions / copy. */
export const textAssistRequestSchema = z
  .object({
    text: z.string().min(1),
    task: z.enum(['rewrite', 'summarize', 'captions', 'polish', 'expand']),
    language: z.string().optional(),
    instruction: z.string().optional(),
  })
  .merge(llmProviderRefSchema);

export const textAssistResponseSchema = z.object({
  task: z.enum(['rewrite', 'summarize', 'captions', 'polish', 'expand']),
  text: z.string(),
  provider: llmProviderIdSchema,
  model: z.string(),
});

export const transcribeResultSchema = z.object({
  segments: z.array(transcriptSegmentSchema),
  transcript: z.string(),
  detectedLanguage: z.string().optional(),
  provider: llmProviderIdSchema.optional(),
  model: z.string().optional(),
});

export const aiFeatureCapabilitySchema = z.object({
  feature: aiFeatureSchema,
  available: z.boolean(),
  preferredProvider: llmProviderIdSchema.optional(),
  preferredModel: z.string().optional(),
  note: z.string().optional(),
});

export const aiCapabilitiesResponseSchema = z.object({
  defaultProvider: llmProviderIdSchema,
  features: z.array(aiFeatureCapabilitySchema),
});

/** Video highlight analysis for reel / summary UI. */
export const videoAnalyzeRequestSchema = z
  .object({
    mediaBase64: z.string().min(1),
    mimeType: z.string().min(1),
    language: z.string().optional(),
    durationSec: z.number().positive().optional(),
  })
  .merge(llmProviderRefSchema);

export const videoHighlightSchema = z.object({
  start: z.string(),
  end: z.string(),
  narration: z.string(),
});

export const videoAnalyzeResponseSchema = z.object({
  summary: z.string(),
  highlights: z.array(videoHighlightSchema),
  provider: llmProviderIdSchema.optional(),
  model: z.string().optional(),
});

export type LlmProviderId = z.infer<typeof llmProviderIdSchema>;
export type TranscriptSegment = z.infer<typeof transcriptSegmentSchema>;
export type ClipRange = z.infer<typeof clipRangeSchema>;
export type AiJobType = z.infer<typeof aiJobTypeSchema>;
export type StartAiJobResponse = z.infer<typeof startAiJobResponseSchema>;
export type AiJobResponse = z.infer<typeof aiJobResponseSchema>;
export type TranscribeRequest = z.infer<typeof transcribeRequestSchema>;
export type SubtitlesRequest = z.infer<typeof subtitlesRequestSchema>;
export type SubtitlesResponse = z.infer<typeof subtitlesResponseSchema>;
export type ClipSuggestRequest = z.infer<typeof clipSuggestRequestSchema>;
export type ClipSuggestResponse = z.infer<typeof clipSuggestResponseSchema>;
export type LlmCompleteRequest = z.infer<typeof llmCompleteRequestSchema>;
export type LlmCompleteResponse = z.infer<typeof llmCompleteResponseSchema>;
export type LlmProvidersResponse = z.infer<typeof llmProvidersResponseSchema>;
export type AgentRunRequest = z.infer<typeof agentRunRequestSchema>;
export type AgentRunResponse = z.infer<typeof agentRunResponseSchema>;
export type TranslateRequest = z.infer<typeof translateRequestSchema>;
export type TranslateResponse = z.infer<typeof translateResponseSchema>;
export type ImageAnalyzeRequest = z.infer<typeof imageAnalyzeRequestSchema>;
export type ImageAnalyzeResponse = z.infer<typeof imageAnalyzeResponseSchema>;
export type VoiceTtsRequest = z.infer<typeof voiceTtsRequestSchema>;
export type VoiceTtsResponse = z.infer<typeof voiceTtsResponseSchema>;
export type TextAssistRequest = z.infer<typeof textAssistRequestSchema>;
export type TextAssistResponse = z.infer<typeof textAssistResponseSchema>;
export type TranscribeResult = z.infer<typeof transcribeResultSchema>;
export type AiCapabilitiesResponse = z.infer<typeof aiCapabilitiesResponseSchema>;
export type VideoAnalyzeRequest = z.infer<typeof videoAnalyzeRequestSchema>;
export type VideoAnalyzeResponse = z.infer<typeof videoAnalyzeResponseSchema>;
