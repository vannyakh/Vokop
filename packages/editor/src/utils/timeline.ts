/**
 * Timeline geometry utilities — adapted from Omniclip's calculate_* utils.
 * Handles pixel ↔ time conversions, zoom, ruler ticks, and layout math.
 */

import type { AnyClip } from '../types/clip.js';

// ─── Pixel ↔ Time ────────────────────────────────────────────────────────────

/** Convert a timeline time (seconds) to pixels at the given px/sec scale. */
export function timeToPx(timeSeconds: number, pxPerSec: number): number {
  return timeSeconds * pxPerSec;
}

/** Convert pixels to timeline time (seconds) at the given px/sec scale. */
export function pxToTime(px: number, pxPerSec: number): number {
  return Math.max(0, px / pxPerSec);
}

/** Convert a timeline time in milliseconds to pixels. */
export function msToPx(ms: number, pxPerSec: number): number {
  return (ms / 1000) * pxPerSec;
}

/** Convert pixels to milliseconds. */
export function pxToMs(px: number, pxPerSec: number): number {
  return Math.max(0, (px / pxPerSec) * 1000);
}

// ─── Zoom ────────────────────────────────────────────────────────────────────

/**
 * Compute the zoom factor multiplier from an integer zoom level.
 * Omniclip uses `Math.pow(2, zoom)` — positive = zoom in, negative = zoom out.
 */
export function zoomFactor(zoomLevel: number): number {
  return Math.pow(2, zoomLevel);
}

/**
 * Derive effective pxPerSec from the base scale and zoom level.
 * `basePxPerSec` is the scale at zoom = 0.
 */
export function effectivePxPerSec(basePxPerSec: number, zoomLevel: number): number {
  return basePxPerSec * zoomFactor(zoomLevel);
}

// ─── Clip geometry (Omniclip-style ms-based) ─────────────────────────────────

/**
 * Width of a clip block in pixels.
 * Omniclip: `(end - start) * Math.pow(2, zoom)`
 */
export function clipWidthPx(clip: AnyClip, zoomLevel: number): number {
  return (clip.end - clip.start) * zoomFactor(zoomLevel);
}

/**
 * Left offset (px) of a clip from the timeline origin.
 * Omniclip: `start_at_position * Math.pow(2, zoom)`
 */
export function clipStartPx(clip: AnyClip, zoomLevel: number): number {
  return clip.start_at_position * zoomFactor(zoomLevel);
}

/**
 * Vertical offset (px) of a clip based on its track position.
 * Stacks tracks using `trackHeights` (Record<track-index, height-in-px>).
 */
export function clipTrackTopPx(
  trackIndex: number,
  trackHeights: number[],
): number {
  return trackHeights.slice(0, trackIndex).reduce((sum, h) => sum + h, 0);
}

// ─── Timeline width ──────────────────────────────────────────────────────────

/**
 * Compute the total scrollable width of the timeline canvas.
 * Adapted from Omniclip's `calculate_timeline_width`.
 *
 * If the computed width fits inside `containerWidth`, returns `containerWidth`
 * instead (no unnecessary horizontal scroll).
 */
export function calculateTimelineWidth(
  clips: AnyClip[],
  zoomLevel: number,
  containerWidth: number,
): number {
  if (clips.length === 0) return containerWidth;

  const lastClip = [...clips].sort((a, b) => {
    const endA = a.start_at_position + (a.end - a.start);
    const endB = b.start_at_position + (b.end - b.start);
    return endB - endA;
  })[0];

  const z = zoomFactor(zoomLevel);
  const clipDuration = lastClip.end - lastClip.start;
  const result =
    (lastClip.start_at_position + clipDuration) * z + (clipDuration / 5) * z;

  return result < containerWidth ? containerWidth : result;
}

// ─── Ruler ticks ─────────────────────────────────────────────────────────────

/**
 * Generate time-ruler tick positions (in seconds) for a given duration and scale.
 * Automatically coarsens the interval when zoom is small.
 */
export function getRulerTicks(
  durationSeconds: number,
  pxPerSec: number,
): number[] {
  if (!durationSeconds) return [0];

  let interval = 1;
  if (pxPerSec < 20) interval = 30;
  else if (pxPerSec < 40) interval = 10;
  else if (pxPerSec < 70) interval = 5;
  else if (pxPerSec < 120) interval = 2;

  const ticks: number[] = [];
  for (let t = 0; t <= durationSeconds; t += interval) ticks.push(t);
  if (ticks[ticks.length - 1] !== durationSeconds) ticks.push(durationSeconds);
  return ticks;
}

// ─── Track layout ────────────────────────────────────────────────────────────

/**
 * Build a top-offset lookup for each track given their heights.
 * Returns an array aligned to `trackHeights` indices.
 */
export function buildTrackTops(trackHeights: number[]): number[] {
  let acc = 0;
  return trackHeights.map((h) => {
    const top = acc;
    acc += h;
    return top;
  });
}

/** Sum of all track heights — total scrollable height of the tracks area. */
export function totalTracksHeight(trackHeights: number[]): number {
  return trackHeights.reduce((sum, h) => sum + h, 0);
}
