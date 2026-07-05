import type { TimelineTrackModel } from '@/features/studio/lib/timelineTypes';

/** Minimum ruler span when the timeline has no clips. */
export const EMPTY_TIMELINE_DURATION_SEC = 3;

export function isTimelineEmpty(tracks: TimelineTrackModel[]): boolean {
  return tracks.every((track) => track.clips.length === 0);
}

export function emptyTimelineDurationSec(duration: number): number {
  return Math.max(EMPTY_TIMELINE_DURATION_SEC, duration || 0);
}
