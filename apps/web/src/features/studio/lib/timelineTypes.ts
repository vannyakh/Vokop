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
  /** Composition X in preview-frame pixels (defaults to video content rect). */
  x?: number;
  /** Composition Y in preview-frame pixels. */
  y?: number;
  /** Composition width in preview-frame pixels. */
  width?: number;
  /** Composition height in preview-frame pixels. */
  height?: number;
  /** Rotation in degrees. */
  rotation?: number;
  /** Opacity 0–1. */
  opacity?: number;
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

/** Track header column width (room for label + menu). */
export const TRACK_HEADER_WIDTH = 188;
export const TIMELINE_RULER_HEIGHT = 26;
export const TIMELINE_BASE_PX_PER_SEC = 80;
export const TIMELINE_MIN_CLIP_SEC = 0.4;

/**
 * Lane heights aligned with Omniclip track rows:
 * default effects lane ~50px, text-only lanes ~30px.
 * @see https://github.com/omni-media/omniclip
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
