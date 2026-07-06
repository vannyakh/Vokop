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

/** `HH:MM:SS:FF` timecode for the preview toolbar (OpenCut-style). */
export function formatFrameTimecode(seconds: number, fps = DEFAULT_TIMELINE_FPS): string {
  const safe = Math.max(0, seconds);
  const fpsInt = Math.max(1, Math.round(fps));
  const totalFrames = Math.round(safe * fpsInt);
  const frames = totalFrames % fpsInt;
  const totalSeconds = Math.floor(totalFrames / fpsInt);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s, frames].map((v) => v.toString().padStart(2, '0')).join(':');
}

/**
 * Parse a user-typed timecode into seconds. Accepts `SS`, `MM:SS`,
 * `HH:MM:SS`, `HH:MM:SS:FF`, and decimal seconds. Returns null when invalid.
 */
export function parseTimecodeInput(input: string, fps = DEFAULT_TIMELINE_FPS): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(':').map((p) => p.trim());
  if (parts.length > 4 || parts.some((p) => p === '' || !/^\d+(\.\d+)?$/.test(p))) {
    return null;
  }
  const nums = parts.map(Number);
  if (nums.length === 1) return nums[0];
  if (nums.length === 2) return nums[0] * 60 + nums[1];
  if (nums.length === 3) return nums[0] * 3600 + nums[1] * 60 + nums[2];
  const fpsInt = Math.max(1, Math.round(fps));
  return nums[0] * 3600 + nums[1] * 60 + nums[2] + nums[3] / fpsInt;
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
