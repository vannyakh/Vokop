export type TimelineTrackId = 'video' | 'text' | 'overlay' | 'audio';

export type TimelineTrackType = 'video' | 'text' | 'overlay' | 'audio';

export interface TimelineClipModel {
  id: string;
  start: number;
  duration: number;
  name: string;
  segmentIndex?: number;
  segmentType?: 'translation' | 'transcript';
  /** Canvas logo / image overlay linked to this clip */
  canvasKind?: 'logo' | 'image';
}

export interface TimelineTrackModel {
  id: TimelineTrackId;
  type: TimelineTrackType;
  label: string;
  clips: TimelineClipModel[];
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
