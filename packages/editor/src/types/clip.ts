/**
 * Core timeline clip and track types — inspired by Omniclip's effect/track model.
 * All times are in milliseconds unless noted.
 *
 * Omniclip model key insights adapted here:
 *  - `start` / `end`  → in-point and out-point within the source media
 *  - `start_at_position` → where the clip begins on the timeline
 *  - `track`           → numeric track index (0 = primary)
 *  - Effects (clips on the timeline) are discriminated by `kind`
 */

export type ClipKind = 'video' | 'audio' | 'image' | 'text' | 'caption';

export interface ClipBase {
  id: string;
  /** Display name (file name for media, user label for text) */
  name: string;
  kind: ClipKind;
  /** Track index — 0 is the primary video/audio track */
  track: number;
  /** In-point in source media (ms). 0 for non-trimmable clips. */
  start: number;
  /** Out-point in source media (ms) */
  end: number;
  /** Timeline position where this clip starts (ms from timeline origin) */
  start_at_position: number;
  /** Whether the clip is selected */
  selected?: boolean;
}

export interface VideoClip extends ClipBase {
  kind: 'video';
  file_hash: string;
  /** Duration of the source video file (ms) */
  file_duration: number;
}

export interface AudioClip extends ClipBase {
  kind: 'audio';
  file_hash: string;
}

export interface ImageClip extends ClipBase {
  kind: 'image';
  file_hash: string;
}

export interface TextClip extends ClipBase {
  kind: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  fontWeight: string;
  fontVariant: string;
  fill: string[];
  fillGradientType: number;
  fillGradientStops: number[];
  stroke: string;
  strokeThickness: number;
  lineJoin: CanvasLineJoin;
  miterLimit: number;
  letterSpacing: number;
  textBaseline: string;
  wordWrap: boolean;
  wordWrapWidth: number;
  breakWords: boolean;
  align: CanvasTextAlign;
  whiteSpace: string;
  lineHeight: number;
  leading: number;
  dropShadow: boolean;
  dropShadowColor: string;
  dropShadowAlpha: number;
  dropShadowAngle: number;
  dropShadowBlur: number;
  dropShadowDistance: number;
}

export interface CaptionClip extends ClipBase {
  kind: 'caption';
  text: string;
  style: 'standard' | 'highlight' | 'karaoke' | 'none';
  speakerId?: string;
}

export type AnyClip = VideoClip | AudioClip | ImageClip | TextClip | CaptionClip;

// ─── Tracks ─────────────────────────────────────────────────────────────────

export type TrackKind = 'video' | 'audio' | 'overlay' | 'text' | 'caption';

export interface TimelineTrack {
  id: string;
  kind: TrackKind;
  label: string;
  visible: boolean;
  locked: boolean;
  muted: boolean;
  /** Numeric index for Omniclip-style position calculations */
  index: number;
}

// ─── Selection ──────────────────────────────────────────────────────────────

export interface ClipSelection {
  clipId: string;
  trackId: string;
}

// ─── Trim ───────────────────────────────────────────────────────────────────

export type TrimSide = 'left' | 'right';

export interface TrimState {
  clipId: string;
  side: TrimSide;
  originalStart: number;
  originalEnd: number;
  originalStartAtPosition: number;
}

// ─── Drag ───────────────────────────────────────────────────────────────────

export interface DragOffset {
  x: number;
  y: number;
}

export interface DragState {
  clipId: string;
  trackId: string;
  offset: DragOffset;
  /** Current proposed timeline position in ms */
  proposedPosition: number;
  /** Current proposed track index */
  proposedTrack: number;
}
