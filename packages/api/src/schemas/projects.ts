import { z } from 'zod';

export const projectStatusSchema = z.enum(['done', 'processing', 'failed']);
export const projectAspectRatioSchema = z.enum(['original', '16:9', '4:3', '2:1', '9:16', '1:1', '3:4']);

export const mediaClipSchema = z.object({
  id: z.string(),
  start: z.number(),
  duration: z.number().positive(),
  sourceStart: z.number().nonnegative(),
  name: z.string(),
  trackId: z.string().optional(),
  mediaAssetId: z.string().optional(),
  volume: z.number().min(0).max(2).optional(),
  pan: z.number().min(-1).max(1).optional(),
  fadeInSec: z.number().nonnegative().optional(),
  fadeOutSec: z.number().nonnegative().optional(),
  muted: z.boolean().optional(),
  linkedVideoClipId: z.string().optional(),
});

export const projectCanvasTextStyleSchema = z.object({
  fill: z.string().optional(),
  fontWeight: z.enum(['normal', 'bold']).optional(),
  fontStyle: z.enum(['normal', 'italic']).optional(),
  letterSpacing: z.number().optional(),
  textTransform: z.enum(['none', 'uppercase']).optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  shadowColor: z.string().optional(),
  shadowBlur: z.number().optional(),
  background: z.string().optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
});

export const projectCanvasElementSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'overlay', 'logo', 'image']),
  text: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  fontSize: z.number(),
  rotation: z.number(),
  opacity: z.number(),
  src: z.string().optional(),
  segmentIndex: z.number().optional(),
  segmentType: z.enum(['translation', 'transcript']).optional(),
  templateId: z.string().optional(),
  textStyle: projectCanvasTextStyleSchema.optional(),
  fontFamily: z.string().optional(),
  textEffect: z.string().optional(),
  startTime: z.number(),
  endTime: z.number(),
  trackId: z.string().optional(),
});

export const projectMediaAssetSchema = z.object({
  id: z.string(),
  kind: z.enum(['video', 'audio', 'image']),
  name: z.string(),
  mimeType: z.string(),
  size: z.number(),
  duration: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  isPrimary: z.boolean().optional(),
});

export const extraTimelineTrackSchema = z.object({
  id: z.string(),
  type: z.enum(['video', 'text', 'image', 'sticker', 'effect', 'sound', 'audio']),
  label: z.string(),
});

export const projectEditorStateSchema = z.object({
  videoClips: z.array(mediaClipSchema).optional(),
  audioClips: z.array(mediaClipSchema).optional(),
  canvasElements: z.array(projectCanvasElementSchema).optional(),
  transcript: z.string().optional(),
  translatedText: z.string().optional(),
  mediaAssets: z.array(projectMediaAssetSchema).optional(),
  timelineTrackHidden: z.array(z.string()).optional(),
  timelineTrackOrder: z.array(z.string()).optional(),
  extraTimelineTracks: z.array(extraTimelineTrackSchema).optional(),
});

export const projectSchema = z.object({
  id: z.string(),
  title: z.string(),
  sourceLang: z.string(),
  targetLang: z.string(),
  aspectRatio: projectAspectRatioSchema.default('original'),
  status: projectStatusSchema,
  progress: z.number().min(0).max(100).optional(),
  durationSec: z.number().nonnegative().optional(),
  editorState: projectEditorStateSchema.optional(),
  /** ISO timestamp when soft-deleted; omitted/null when active. */
  deletedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const projectsListResponseSchema = z.object({
  projects: z.array(projectSchema),
});

export const createProjectRequestSchema = z.object({
  title: z.string().min(1).max(255),
  sourceLang: z.string().min(2).max(8).optional(),
  targetLang: z.string().min(2).max(8).optional(),
  aspectRatio: projectAspectRatioSchema.optional(),
  durationSec: z.number().nonnegative().optional(),
  status: projectStatusSchema.optional(),
  progress: z.number().min(0).max(100).optional(),
});

export const updateProjectRequestSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  sourceLang: z.string().min(2).max(8).optional(),
  targetLang: z.string().min(2).max(8).optional(),
  aspectRatio: projectAspectRatioSchema.optional(),
  durationSec: z.number().nonnegative().optional(),
  status: projectStatusSchema.optional(),
  progress: z.number().min(0).max(100).optional(),
  editorState: projectEditorStateSchema.optional(),
});

export const projectResponseSchema = z.object({
  project: projectSchema,
});

export type Project = z.infer<typeof projectSchema>;
export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type ProjectAspectRatio = z.infer<typeof projectAspectRatioSchema>;
export type ProjectEditorState = z.infer<typeof projectEditorStateSchema>;
export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;
