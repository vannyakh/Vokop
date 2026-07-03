/**
 * Clip utility functions — adapted from Omniclip's transition/trim/split utilities.
 * All time values are in milliseconds.
 */

import type { AnyClip, ClipBase } from '../types/clip.js';
import type { TouchingClipPair } from '../types/transition.js';

// ─── Touching clips (for transitions) ────────────────────────────────────────

/**
 * Find all pairs of clips on the same track that are adjacent (touching or
 * overlapping at their ends). The first clip in a pair ends where the second begins.
 *
 * Adapted from Omniclip's `transitionManager.findTouchingClips`.
 */
export function findTouchingClipPairs(clips: AnyClip[]): TouchingClipPair[] {
  const pairs: TouchingClipPair[] = [];

  const sorted = [...clips].sort((a, b) => a.start_at_position - b.start_at_position);

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];

    if (a.track !== b.track) continue;

    const aEnd = a.start_at_position + (a.end - a.start);
    const bStart = b.start_at_position;

    // Touching = aEnd equals bStart (within a 1 ms tolerance)
    if (Math.abs(aEnd - bStart) <= 1) {
      pairs.push({
        outgoing: { id: a.id, end: a.end, start_at_position: a.start_at_position, track: a.track },
        incoming: { id: b.id, start: b.start, start_at_position: b.start_at_position, track: b.track },
      });
    }
  }

  return pairs;
}

// ─── Transition duration math ─────────────────────────────────────────────────

/**
 * Calculate the maximum valid transition duration between two clips.
 * Adapted from Omniclip's `calculateMaxTransitionDuration`.
 *
 * The limit is the shorter clip duration divided by 1.2 so the transition
 * never consumes the whole clip.
 */
export function calculateMaxTransitionDuration(
  outgoingClip: Pick<ClipBase, 'start' | 'end'> | undefined,
  incomingClip: Pick<ClipBase, 'start' | 'end'> | undefined,
): number {
  if (!outgoingClip || !incomingClip) return 0;
  const outDuration = outgoingClip.end - outgoingClip.start;
  const inDuration = incomingClip.end - incomingClip.start;
  const shorter = Math.min(outDuration, inDuration);
  return shorter / 1.2;
}

/**
 * Snap transition duration to the nearest frame boundary.
 * Adapted from Omniclip's `normalizeTransitionDuration`.
 *
 * @param duration Desired duration in ms
 * @param frameDuration ms per frame (e.g. 1000/30 ≈ 33.33)
 */
export function normalizeTransitionDuration(
  duration: number,
  frameDuration: number,
): number {
  return Math.round(duration / frameDuration) * frameDuration;
}

// ─── Clip trim math ───────────────────────────────────────────────────────────

/**
 * Compute new `start` / `end` / `start_at_position` after trimming the left handle.
 * Clamped to `minClipMs` minimum duration.
 */
export function trimClipLeft(
  clip: ClipBase,
  deltaPx: number,
  pxPerMs: number,
  minClipMs = 200,
): Partial<ClipBase> {
  const deltaMs = deltaPx / pxPerMs;
  const newStart = Math.max(0, clip.start + deltaMs);
  const newStartAtPosition = Math.max(0, clip.start_at_position + deltaMs);
  const newDuration = clip.end - newStart;
  if (newDuration < minClipMs) return {};
  return { start: newStart, start_at_position: newStartAtPosition };
}

/**
 * Compute new `end` after trimming the right handle.
 * Clamped to `minClipMs` minimum duration.
 */
export function trimClipRight(
  clip: ClipBase,
  deltaPx: number,
  pxPerMs: number,
  minClipMs = 200,
): Partial<ClipBase> {
  const deltaMs = deltaPx / pxPerMs;
  const newEnd = clip.end + deltaMs;
  const newDuration = newEnd - clip.start;
  if (newDuration < minClipMs) return {};
  return { end: newEnd };
}

// ─── Split ───────────────────────────────────────────────────────────────────

/**
 * Split a clip at a given timeline position (ms), returning two updated clips.
 * The caller is responsible for assigning new IDs.
 */
export function splitClipAt<T extends ClipBase>(
  clip: T,
  splitAtPosition: number,
): [T, T] {
  const sourceTime = clip.start + (splitAtPosition - clip.start_at_position);

  const left: T = {
    ...clip,
    end: sourceTime,
  };

  const right: T = {
    ...clip,
    start: sourceTime,
    start_at_position: splitAtPosition,
  };

  return [left, right];
}

// ─── Clip at time ─────────────────────────────────────────────────────────────

/**
 * Find the clip active at a given timeline position (ms).
 * A clip is active when `start_at_position ≤ position < start_at_position + duration`.
 */
export function findClipAtPosition<T extends AnyClip>(
  clips: T[],
  positionMs: number,
  trackId?: string | number,
): T | undefined {
  return clips.find((c) => {
    if (trackId !== undefined && c.track !== trackId) return false;
    const clipEnd = c.start_at_position + (c.end - c.start);
    return c.start_at_position <= positionMs && positionMs < clipEnd;
  });
}

// ─── Duration ────────────────────────────────────────────────────────────────

/**
 * Compute total timeline duration (ms) from a list of clips — the latest end point.
 */
export function computeTimelineDurationMs(clips: AnyClip[]): number {
  if (clips.length === 0) return 0;
  return Math.max(...clips.map((c) => c.start_at_position + (c.end - c.start)));
}
