export type TimelineTrackId = 'video' | 'text' | 'overlay' | 'audio' | (string & {});

export type TimelineTrackType = 'video' | 'text' | 'overlay' | 'audio';

export interface ExtraTimelineTrack {
  id: string;
  type: 'overlay';
  label: string;
}

/**
 * Omniclip-style media clip (source of truth for video/audio tracks).
 * `start`/`duration` are timeline placement; `sourceStart` is the in-point in the media file.
 */
export interface MediaClip {
  id: string;
  start: number;
  duration: number;
  sourceStart: number;
  name: string;
}

export interface TimelineClipModel {
  id: string;
  start: number;
  duration: number;
  name: string;
  segmentIndex?: number;
  segmentType?: 'translation' | 'transcript';
  /** Canvas logo / image / template text linked to this clip */
  canvasKind?: 'logo' | 'image' | 'template';
  /** Video/audio media clip (Omniclip-style) */
  mediaKind?: 'video' | 'audio';
  sourceStart?: number;
}

export interface TimelineTrackModel {
  id: TimelineTrackId;
  type: TimelineTrackType;
  label: string;
  clips: TimelineClipModel[];
  /** Extra overlay row (not the default overlay track) */
  isExtra?: boolean;
}

export const TRACK_HEADER_WIDTH = 132;
export const TIMELINE_RULER_HEIGHT = 26;
export const TIMELINE_BASE_PX_PER_SEC = 80;
export const TIMELINE_MIN_CLIP_SEC = 0.4;

export const TRACK_HEIGHT: Record<TimelineTrackType, number> = {
  video: 56,
  text: 40,
  overlay: 40,
  audio: 48,
};

export const TRACK_ORDER: TimelineTrackId[] = ['video', 'text', 'overlay', 'audio'];
