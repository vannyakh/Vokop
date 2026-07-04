/**
 * Timeline placement helpers — adapted from Omniclip
 * `s/context/controllers/timeline/utils`.
 */

import type { AnyClip } from '../types/clip.js';

/** Clips on a numeric track index. */
export function getClipsOnTrack<T extends AnyClip>(clips: T[], trackId: number): T[] {
  return clips.filter((c) => c.track === trackId);
}

/**
 * Find the earliest free end position across tracks for a new clip.
 * Returns timeline position (ms) and track index.
 */
export function findPlaceForNewClip(
  clips: AnyClip[],
  trackCount: number,
): { positionMs: number; track: number } {
  let closestPosition: number | null = null;
  let track = 0;

  for (let trackIndex = 0; trackIndex < trackCount; trackIndex++) {
    const trackClips = getClipsOnTrack(clips, trackIndex).sort(
      (a, b) => a.start_at_position - b.start_at_position,
    );
    const last = trackClips[trackClips.length - 1];
    if (last) {
      const end = last.start_at_position + (last.end - last.start);
      if (closestPosition === null || end < closestPosition) {
        closestPosition = end;
        track = trackIndex;
      }
    } else {
      closestPosition = 0;
      track = trackIndex;
      break;
    }
  }

  return { positionMs: closestPosition ?? 0, track };
}
