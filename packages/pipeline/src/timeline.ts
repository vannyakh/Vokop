import { z } from "zod";

/**
 * Timeline schema — the single contract shared by the studio editor,
 * the Mongo `projects` collection, render workers and the desktop app.
 *
 * Model: CapCut-style tracks. Track order matters for video compositing:
 * earlier video tracks render below later ones (index 0 = bottom layer).
 *
 * Time units: seconds (float). `start`/`duration` are timeline time.
 * `in` is source-media time (where the clip starts inside its asset).
 * With speed S, a clip of timeline duration D consumes D*S seconds of source.
 *
 * NOTE: when packages/schemas exists, move this file there and re-export
 * from this package (`export * from "@vokop/schemas/timeline"`).
 */

export const FitModeSchema = z.enum(["contain", "cover", "stretch"]);
export type FitMode = z.infer<typeof FitModeSchema>;

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "expected #RRGGBB hex color");

export const TransformSchema = z
  .object({
    /** pixel offset from canvas center */
    x: z.number().default(0),
    y: z.number().default(0),
    /** uniform scale multiplier applied after fit */
    scale: z.number().positive().max(20).default(1),
    /** degrees, clockwise */
    rotation: z.number().min(-360).max(360).default(0),
    opacity: z.number().min(0).max(1).default(1),
  })
  .default({});
export type Transform = z.infer<typeof TransformSchema>;

const clipBase = {
  id: z.string().min(1),
  /** timeline position, seconds */
  start: z.number().min(0),
  /** timeline duration, seconds */
  duration: z.number().positive(),
};

/** Parametric EQ band — mirrors the studio clip inspector's equalizer model. */
export const EqBandSchema = z.object({
  id: z.string(),
  type: z.enum(["highpass", "lowshelf", "peaking", "highshelf", "lowpass"]),
  freq: z.number().positive(),
  gainDb: z.number(),
  q: z.number().positive(),
  enabled: z.boolean(),
});
export type EqBand = z.infer<typeof EqBandSchema>;

export const ClipEqSchema = z.object({
  enabled: z.boolean(),
  preset: z.string().optional(),
  bands: z.array(EqBandSchema).default([]),
});
export type ClipEq = z.infer<typeof ClipEqSchema>;

export const VideoClipSchema = z.object({
  ...clipBase,
  assetId: z.string().min(1),
  /** offset into source media, seconds */
  in: z.number().min(0).default(0),
  /** playback speed; 2 = twice as fast */
  speed: z.number().min(0.1).max(10).default(1),
  fit: FitModeSchema.default("contain"),
  transform: TransformSchema,
  muted: z.boolean().default(false),
  /** volume of the clip's own audio track, if the asset has one */
  volume: z.number().min(0).max(4).default(1),
  /** visual opacity fade-in/out (fade to/from transparent), seconds */
  fadeInSec: z.number().min(0).default(0),
  fadeOutSec: z.number().min(0).default(0),
  /** equalizer applied to this clip's own audio track, if any */
  eq: ClipEqSchema.optional(),
});
export type VideoClip = z.infer<typeof VideoClipSchema>;

export const AudioClipSchema = z.object({
  ...clipBase,
  assetId: z.string().min(1),
  in: z.number().min(0).default(0),
  speed: z.number().min(0.1).max(10).default(1),
  volume: z.number().min(0).max(4).default(1),
  fadeInSec: z.number().min(0).default(0),
  fadeOutSec: z.number().min(0).default(0),
  eq: ClipEqSchema.optional(),
});
export type AudioClip = z.infer<typeof AudioClipSchema>;

export const TextStyleSchema = z
  .object({
    /** fontconfig family name; ignored when RenderOptions.fontFile is set */
    fontFamily: z.string().default("Sans"),
    fontSizePx: z.number().int().min(8).max(512).default(48),
    color: hexColor.default("#FFFFFF"),
    /** optional box behind the text */
    backgroundColor: hexColor.optional(),
    backgroundOpacity: z.number().min(0).max(1).default(0.6),
    /** anchor position as fraction of canvas, 0..1 (0.5,0.5 = centered) */
    x: z.number().min(0).max(1).default(0.5),
    y: z.number().min(0).max(1).default(0.5),
  })
  .default({});
export type TextStyle = z.infer<typeof TextStyleSchema>;

export const TextClipSchema = z.object({
  ...clipBase,
  text: z.string().min(1).max(2000),
  style: TextStyleSchema,
});
export type TextClip = z.infer<typeof TextClipSchema>;

export const VideoTrackSchema = z.object({
  id: z.string().min(1),
  type: z.literal("video"),
  clips: z.array(VideoClipSchema).default([]),
});
export const AudioTrackSchema = z.object({
  id: z.string().min(1),
  type: z.literal("audio"),
  clips: z.array(AudioClipSchema).default([]),
});
export const TextTrackSchema = z.object({
  id: z.string().min(1),
  type: z.literal("text"),
  clips: z.array(TextClipSchema).default([]),
});

export const TrackSchema = z.discriminatedUnion("type", [
  VideoTrackSchema,
  AudioTrackSchema,
  TextTrackSchema,
]);
export type Track = z.infer<typeof TrackSchema>;
export type VideoTrack = z.infer<typeof VideoTrackSchema>;
export type AudioTrack = z.infer<typeof AudioTrackSchema>;
export type TextTrack = z.infer<typeof TextTrackSchema>;

export const TimelineSchema = z.object({
  version: z.literal(1).default(1),
  width: z.number().int().min(16).max(7680),
  height: z.number().int().min(16).max(4320),
  fps: z.number().min(1).max(120).default(30),
  background: hexColor.default("#000000"),
  tracks: z.array(TrackSchema).default([]),
});
export type Timeline = z.infer<typeof TimelineSchema>;

/** Parse + validate unknown input into a Timeline (throws ZodError). */
export function parseTimeline(input: unknown): Timeline {
  return TimelineSchema.parse(input);
}

/** Total duration = latest clip end across all tracks. */
export function computeDuration(timeline: Timeline): number {
  let end = 0;
  for (const track of timeline.tracks) {
    for (const clip of track.clips) {
      end = Math.max(end, clip.start + clip.duration);
    }
  }
  return end;
}

/** All assetIds referenced by the timeline (video + audio clips). */
export function referencedAssetIds(timeline: Timeline): string[] {
  const ids = new Set<string>();
  for (const track of timeline.tracks) {
    if (track.type === "text") continue;
    for (const clip of track.clips) ids.add(clip.assetId);
  }
  return [...ids];
}
