import { z } from 'zod';

export const projectStatusSchema = z.enum(['done', 'processing', 'failed']);
export const projectAspectRatioSchema = z.enum(['original', '16:9', '4:3', '2:1', '9:16', '1:1', '3:4']);

export const eqBandSchema = z.object({
  id: z.string(),
  type: z.enum(['highpass', 'lowshelf', 'peaking', 'highshelf', 'lowpass']),
  freq: z.number().positive(),
  gainDb: z.number(),
  q: z.number().positive(),
  enabled: z.boolean(),
});

export const clipEqSchema = z.object({
  enabled: z.boolean(),
  preset: z.string(),
  bands: z.array(eqBandSchema),
});

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
  videoFadeInSec: z.number().nonnegative().optional(),
  videoFadeOutSec: z.number().nonnegative().optional(),
  eq: clipEqSchema.optional(),
  muted: z.boolean().optional(),
  linkedVideoClipId: z.string().optional(),
});

export const projectCanvasTextStyleSchema = z.object({
  fill: z.string().optional(),
  fillGradient: z
    .object({
      colors: z.tuple([z.string(), z.string()]),
      direction: z.enum(['vertical', 'horizontal']),
    })
    .optional(),
  fontWeight: z.enum(['normal', 'bold']).optional(),
  fontStyle: z.enum(['normal', 'italic']).optional(),
  underline: z.boolean().optional(),
  letterSpacing: z.number().optional(),
  lineHeight: z.number().optional(),
  textTransform: z.enum(['none', 'uppercase']).optional(),
  wrap: z.enum(['word', 'char', 'none']).optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  strokeLineJoin: z.enum(['miter', 'round', 'bevel']).optional(),
  shadowColor: z.string().optional(),
  shadowBlur: z.number().optional(),
  shadowOpacity: z.number().optional(),
  shadowAngle: z.number().optional(),
  shadowDistance: z.number().optional(),
  background: z.string().optional(),
  backgroundRadius: z.number().optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
});

export const projectCanvasKeyframeSchema = z.object({
  id: z.string(),
  offset: z.number(),
  x: z.number().optional(),
  y: z.number().optional(),
  opacity: z.number().optional(),
  rotation: z.number().optional(),
  scale: z.number().optional(),
  easing: z.enum(['linear', 'ease-in', 'ease-out', 'ease-in-out']).optional(),
});

export const projectCanvasClipAnimationSchema = z.object({
  preset: z.enum([
    'fade-in',
    'fade-out',
    'slide-in-left',
    'slide-in-right',
    'slide-in-up',
    'slide-in-down',
    'slide-out-left',
    'slide-out-right',
    'slide-out-up',
    'slide-out-down',
    'zoom-in',
    'zoom-out',
    'spin-in',
    'spin-out',
  ]),
  durationSec: z.number().positive().max(10),
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
  keyframes: z.array(projectCanvasKeyframeSchema).optional(),
  animationIn: projectCanvasClipAnimationSchema.optional(),
  animationOut: projectCanvasClipAnimationSchema.optional(),
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

export const projectCoverSchema = z.object({
  url: z.string(),
  source: z.enum(['video', 'upload']),
  timeSec: z.number().nonnegative().optional(),
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
  projectCover: projectCoverSchema.optional(),
  /**
   * Composition coordinate space for videoClips/canvasElements x/y/width/height/fontSize.
   * 'legacy-px' (or missing) = live on-screen pixels (old projects, needs one-time migration).
   * 'fraction-v2' = fraction (0..1) of the video content rect (current format).
   */
  compositionSpace: z.enum(['legacy-px', 'fraction-v2']).optional(),
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
  thumbnailUrl: z.string().optional(),
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
  thumbnailUrl: z.string().optional(),
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
