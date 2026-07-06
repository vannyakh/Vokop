/**
 * Studio timeline geometry — thin wrappers over `@vokop/editor`
 * (Omniclip-adapted pixel/time/ruler math).
 */

import {
  formatTimecode,
  getRulerTicks as editorRulerTicks,
  pxToTime as editorPxToTime,
  snappedSeekSeconds,
  timeToPx as editorTimeToPx,
  DEFAULT_TIMELINE_FPS,
} from '@vokop/editor';

/** Always `HH:MM:SS` for studio chrome (playback bar, inspector). */
export function formatStudioTimecode(seconds: number): string {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  return [h, m, s].map((v) => v.toString().padStart(2, '0')).join(':');
}

export function timeToPx(time: number, pxPerSec: number): number {
  return editorTimeToPx(time, pxPerSec);
}

export function pxToTime(px: number, pxPerSec: number): number {
  return editorPxToTime(px, pxPerSec);
}

export function getRulerTicks(duration: number, pxPerSec: number): number[] {
  return editorRulerTicks(duration, pxPerSec);
}

/** Frame-aligned seek (OpenCut-style media ticks). */
export function snapTimelineSeekTime(
  timeSec: number,
  durationSec: number,
  fps = DEFAULT_TIMELINE_FPS,
): number {
  return snappedSeekSeconds({ timeSec, durationSec, fps });
}

export { formatTimecode, DEFAULT_TIMELINE_FPS };
