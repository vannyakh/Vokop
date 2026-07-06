/**
 * Timeline clip snap — adapted from OpenCut `@templates/OpenCut/apps/web/src/timeline/snapping`.
 */

import { timeToPx } from '@/features/studio/lib/timelineUtils';
import { roundSecondsToFrame, DEFAULT_TIMELINE_FPS } from '@vokop/editor';
import type { TimelineClipModel } from '@/features/studio/lib/timelineTypes';
import { TIMELINE_MIN_CLIP_SEC } from '@/features/studio/lib/timelineTypes';

export const TIMELINE_SNAP_PX = 10;

export interface TimelineSnapResult {
  startSec: number;
  snapTimeSec: number | null;
  snapXPx: number | null;
}

export function resolveTimelineClipSnap(input: {
  rawStartSec: number;
  clipDurationSec: number;
  clips: TimelineClipModel[];
  excludeClipId: string;
  timelineDurationSec: number;
  playheadSec: number;
  pxPerSec: number;
  snapPx?: number;
  enabled?: boolean;
}): TimelineSnapResult {
  if (input.enabled === false) {
    return { startSec: input.rawStartSec, snapTimeSec: null, snapXPx: null };
  }

  const thresholdSec = (input.snapPx ?? TIMELINE_SNAP_PX) / input.pxPerSec;
  const edges: number[] = [0, input.timelineDurationSec, input.playheadSec];

  for (const clip of input.clips) {
    if (clip.id === input.excludeClipId) continue;
    edges.push(clip.start, clip.start + clip.duration);
  }

  let bestStart = input.rawStartSec;
  let bestDist = thresholdSec + 1;
  let bestEdge: number | null = null;

  const anchorEnd = input.rawStartSec + input.clipDurationSec;
  for (const edge of edges) {
    const dStart = Math.abs(input.rawStartSec - edge);
    if (dStart < bestDist) {
      bestDist = dStart;
      bestStart = edge;
      bestEdge = edge;
    }
    const dEnd = Math.abs(anchorEnd - edge);
    if (dEnd < bestDist) {
      bestDist = dEnd;
      bestStart = edge - input.clipDurationSec;
      bestEdge = edge;
    }
  }

  if (bestEdge === null) {
    return { startSec: input.rawStartSec, snapTimeSec: null, snapXPx: null };
  }

  return {
    startSec: bestStart,
    snapTimeSec: bestEdge,
    snapXPx: timeToPx(bestEdge, input.pxPerSec),
  };
}

/** Quantize clip timing to frame boundaries on drag commit. */
export function snapClipTimingToFrame(input: {
  startSec: number;
  durationSec: number;
  timelineDurationSec: number;
  fps?: number;
}): { startSec: number; durationSec: number } {
  const fps = input.fps ?? DEFAULT_TIMELINE_FPS;
  const minDuration = TIMELINE_MIN_CLIP_SEC;
  const startSec = roundSecondsToFrame(Math.max(0, input.startSec), fps);
  const endSec = roundSecondsToFrame(
    Math.min(input.timelineDurationSec, startSec + Math.max(minDuration, input.durationSec)),
    fps,
  );
  const durationSec = Math.max(minDuration, endSec - startSec);
  return { startSec, durationSec };
}
