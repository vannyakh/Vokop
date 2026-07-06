import type { CompositionBackground } from '@vokop/shared';
import type { ClipEq } from '@/features/studio/lib/clipEq';

export type TimelineTrackId =
  | 'video'
  | 'text'
  | 'image'
  | 'sticker'
  | 'effect'
  | 'sound'
  | 'audio'
  | 'overlay' // legacy visual track
  | (string & {});

/** Primary / multi-select identity for a timeline clip. */
export interface TimelineSelectionItem {
  trackId: TimelineTrackId;
  clipId: string;
}

export type TimelineTrackType =
  | 'video'
  | 'text'
  | 'image'
  | 'sticker'
  | 'effect'
  | 'sound'
  | 'audio'
  | 'overlay';

/** User-created tracks (core tracks stay built-in). */
export type ExtraTrackType =
  | 'video'
  | 'text'
  | 'image'
  | 'sticker'
  | 'effect'
  | 'sound'
  | 'audio';

export interface ExtraTimelineTrack {
  id: string;
  type: ExtraTrackType;
  label: string;
}

export const CORE_TRACK_IDS = [
  'video',
  'text',
  'image',
  'sticker',
  'effect',
  'sound',
  'audio',
] as const;

export const ADDABLE_TRACK_TYPES: { type: ExtraTrackType; label: string }[] = [
  { type: 'video', label: 'Video track' },
  { type: 'image', label: 'Image track' },
  { type: 'sticker', label: 'Sticker track' },
  { type: 'text', label: 'Text track' },
  { type: 'effect', label: 'Effect track' },
  { type: 'sound', label: 'Sound track' },
  { type: 'audio', label: 'Audio track' },
];

export function isCoreTimelineTrack(trackId: string): boolean {
  return (CORE_TRACK_IDS as readonly string[]).includes(trackId);
}

/** All tracks can be removed from the timeline (core tracks are hidden, extras deleted). */
export function isDeletableTimelineTrack(_trackId: string): boolean {
  return true;
}

/**
 * Omniclip-style media clip (source of truth for video/audio tracks).
 * `start`/`duration` are timeline placement; `sourceStart` is the in-point in the media file.
 * Optional composition transform places the clip inside the preview frame (Konva-editable).
 */
export interface MediaClip {
  id: string;
  start: number;
  duration: number;
  sourceStart: number;
  name: string;
  /** Composition X as a fraction (0..1) of the video content rect (defaults to filling it). */
  x?: number;
  /** Composition Y as a fraction (0..1) of the video content rect. */
  y?: number;
  /** Composition width as a fraction (0..1) of the video content rect (can exceed 1). */
  width?: number;
  /** Composition height as a fraction (0..1) of the video content rect (can exceed 1). */
  height?: number;
  /** Rotation in degrees. */
  rotation?: number;
  /** Opacity 0–1. */
  opacity?: number;
  /** Timeline track id (defaults to `video` / `audio`). */
  trackId?: string;
  /** Source media library asset for playback. */
  mediaAssetId?: string;
  /** Per-clip playback volume 0–2 (1 = unity). */
  volume?: number;
  /** Stereo pan -1 (left) to 1 (right). */
  pan?: number;
  /** Fade-in duration in seconds. */
  fadeInSec?: number;
  /** Fade-out duration in seconds. */
  fadeOutSec?: number;
  /** Video opacity fade-in duration in seconds (fade from transparent). */
  videoFadeInSec?: number;
  /** Video opacity fade-out duration in seconds (fade to transparent). */
  videoFadeOutSec?: number;
  /** Parametric equalizer settings for this clip's audio. */
  eq?: ClipEq;
  /** Mute embedded audio on this video clip (after detach). */
  muted?: boolean;
  /** Letterbox fill behind this clip (inherits project default when unset). */
  background?: CompositionBackground;
  /** Voice changer filter: original, echo, high, low, etc. */
  voiceFilter?: string;
  /** Pitch 0-100 (default 50) */
  voicePitch?: number;
  /** Timbre 0-100 (default 50) */
  voiceTimbre?: number;
  /** Speed multiplier (default 1) */
  speed?: number;
  /** Mirror horizontally in the composition preview. */
  flipX?: boolean;
  /** Mirror vertically in the composition preview. */
  flipY?: boolean;
  /**
   * Audio clip plays from the main video media (extract / detach).
   * Points at the source video clip id when created.
   */
  linkedVideoClipId?: string;
}

export interface TimelineClipModel {
  id: string;
  start: number;
  duration: number;
  name: string;
  segmentIndex?: number;
  segmentType?: 'translation' | 'transcript';
  /** Canvas logo / image / template text linked to this clip */
  canvasKind?: 'logo' | 'image' | 'template' | 'sticker';
  /** Video/audio media clip (Omniclip-style) */
  mediaKind?: 'video' | 'audio';
  sourceStart?: number;
  /** Keyframe markers (offset seconds from clip start). */
  keyframes?: { id: string; offset: number }[];
}

export interface TimelineTrackModel {
  id: TimelineTrackId;
  type: TimelineTrackType;
  label: string;
  clips: TimelineClipModel[];
  /** User-created track (can be deleted / renamed freely). */
  isExtra?: boolean;
  /** Core tracks cannot be deleted. */
  locked?: boolean;
}

export const DEFAULT_TIMELINE_TRACK_ORDER: string[] = [
  'video',
  'text',
  'image',
  'sticker',
  'effect',
  'sound',
  'audio',
];

/** Core tracks hidden until the user adds content or drops media on the timeline. */
export const DEFAULT_HIDDEN_CORE_TRACKS: string[] = [
  'video',
  'text',
  'image',
  'sticker',
  'effect',
  'sound',
];

/** Track header column width (room for label + menu). */
export const TRACK_HEADER_WIDTH = 220;
export const TIMELINE_RULER_HEIGHT = 34;
export const TIMELINE_RULER_HEIGHT_COMPACT = 26;
/** Below this zoom % the ruler uses compact ticks/labels. */
export const TIMELINE_ZOOM_COMPACT_RULER = 50;
export const TIMELINE_BASE_PX_PER_SEC = 80;
export const TIMELINE_ZOOM_MIN = 10;
export const TIMELINE_ZOOM_MAX = 800;
export const TIMELINE_ZOOM_STEP = 5;
export const TIMELINE_ZOOM_BUTTON_STEP = 25;
export const TIMELINE_MIN_CLIP_SEC = 0.4;

/**
 * Lane heights aligned with track rows:
 * default effects lane ~50px, text-only lanes ~30px.
 */
export const TRACK_HEIGHT: Record<TimelineTrackType, number> = {
  video: 50,
  text: 30,
  image: 50,
  sticker: 50,
  effect: 50,
  sound: 50,
  audio: 50,
  overlay: 50,
};

/** Compact row height when a track is resized smaller than its default. */
export const TRACK_HEIGHT_COMPACT = 24;

export const TRACK_HEIGHT_MIN: Record<TimelineTrackType, number> = {
  video: TRACK_HEIGHT_COMPACT,
  text: 22,
  image: TRACK_HEIGHT_COMPACT,
  sticker: TRACK_HEIGHT_COMPACT,
  effect: TRACK_HEIGHT_COMPACT,
  sound: TRACK_HEIGHT_COMPACT,
  audio: TRACK_HEIGHT_COMPACT,
  overlay: TRACK_HEIGHT_COMPACT,
};

export const TRACK_HEIGHT_MAX: Record<TimelineTrackType, number> = {
  video: 120,
  text: 80,
  image: 120,
  sticker: 120,
  effect: 120,
  sound: 120,
  audio: 120,
  overlay: 120,
};

export function clampTrackHeight(type: TimelineTrackType, height: number): number {
  const min = TRACK_HEIGHT_MIN[type];
  const max = TRACK_HEIGHT_MAX[type];
  return Math.min(max, Math.max(min, Math.round(height)));
}

export function resolveTrackHeight(
  type: TimelineTrackType,
  overrides: Record<string, number>,
  trackId: string,
): number {
  const override = overrides[String(trackId)];
  if (override != null && Number.isFinite(override)) {
    return clampTrackHeight(type, override);
  }
  return TRACK_HEIGHT[type];
}

/** Tracks at or below this height use compact header styling. */
export function isCompactTrackHeight(height: number): boolean {
  return height <= 32;
}

export const TRACK_ORDER: TimelineTrackId[] = [
  'video',
  'text',
  'image',
  'sticker',
  'effect',
  'sound',
  'audio',
];

export const TRACK_TYPE_LABELS: Record<TimelineTrackType, string> = {
  video: 'Video',
  text: 'Text',
  image: 'Image',
  sticker: 'Sticker',
  effect: 'Effect',
  sound: 'Sound',
  audio: 'Audio',
  overlay: 'Overlay',
};

export const TRACK_TYPE_PREFIX: Record<TimelineTrackType, string> = {
  video: 'V',
  text: 'T',
  image: 'I',
  sticker: 'S',
  effect: 'E',
  sound: 'M',
  audio: 'A',
  overlay: 'O',
};
