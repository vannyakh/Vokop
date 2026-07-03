/**
 * Timeline layout constants — shared defaults for the editor canvas.
 * Aligns with the constants in apps/web timelineTypes.ts but lives here so
 * both the web app and any future apps can import from @vokop/editor.
 */

export const TRACK_HEADER_WIDTH = 132;
export const TIMELINE_RULER_HEIGHT = 26;

/** Base pixels-per-second at zoom level 0 */
export const TIMELINE_BASE_PX_PER_SEC = 80;

/** Minimum clip duration in seconds before it can't be trimmed further */
export const TIMELINE_MIN_CLIP_SEC = 0.4;
export const TIMELINE_MIN_CLIP_MS = TIMELINE_MIN_CLIP_SEC * 1000;

/** Height of each track type in pixels */
export const TRACK_HEIGHT: Record<string, number> = {
  video: 56,
  text: 40,
  overlay: 40,
  audio: 48,
  caption: 36,
};

/** Canonical track ordering for default layout */
export const DEFAULT_TRACK_ORDER = ['video', 'text', 'overlay', 'caption', 'audio'] as const;

/** Snap threshold in pixels — clips snap to neighboring clip edges within this range */
export const SNAP_THRESHOLD_PX = 6;

/** Playhead travel padding — auto-scroll margin in pixels */
export const PLAYHEAD_SCROLL_MARGIN_PX = 40;
