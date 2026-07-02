import { z } from 'zod';

export const studioToolIdSchema = z.enum([
  'media',
  'text',
  'audio',
  'voice',
  'captions',
  'effects',
  'transitions',
  'filters',
]);

export const editorPresetSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  cssFilter: z.string().optional(),
  ffmpegFilter: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
});

export const editorToolCatalogSchema = z.object({
  id: studioToolIdSchema,
  label: z.string(),
  presets: z.array(editorPresetSchema),
});

export const editorCatalogResponseSchema = z.object({
  tools: z.array(editorToolCatalogSchema),
});

export const applyEditorEditRequestSchema = z.object({
  sessionId: z.string(),
  tool: studioToolIdSchema,
  presetId: z.string(),
  clipId: z.string().optional(),
  atTime: z.number().nonnegative().optional(),
});

export const applyEditorEditResponseSchema = z.object({
  tool: studioToolIdSchema,
  presetId: z.string(),
  label: z.string(),
  ffmpegFilter: z.string().optional(),
  cssFilter: z.string().optional(),
  appliedAt: z.string().datetime(),
  meta: z.record(z.unknown()).optional(),
});

export const editorPreviewRequestSchema = z.object({
  sessionId: z.string(),
  tool: z.enum(['filters', 'effects']),
  presetId: z.string(),
  atTime: z.number().nonnegative().optional(),
});

export const editorPreviewResponseSchema = z.object({
  image: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  presetId: z.string(),
});

export type EditorCatalogResponse = z.infer<typeof editorCatalogResponseSchema>;
export type ApplyEditorEditResponse = z.infer<typeof applyEditorEditResponseSchema>;
export type EditorPreviewResponse = z.infer<typeof editorPreviewResponseSchema>;
export type StudioToolId = z.infer<typeof studioToolIdSchema>;
