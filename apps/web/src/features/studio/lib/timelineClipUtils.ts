import { TIMELINE_MIN_CLIP_SEC } from '@/features/studio/lib/timelineTypes';
import type { Segment } from '@/types';

export function clampClip(start: number, duration: number, totalDuration: number) {
  const d = Math.max(TIMELINE_MIN_CLIP_SEC, duration);
  const s = Math.max(0, Math.min(Math.max(0, totalDuration - d), start));
  return { start: s, duration: d };
}

export function getSegmentEnd(segments: Segment[], index: number, duration: number): number {
  if (index < segments.length - 1) return segments[index + 1].time;
  return Math.max(duration, segments[index].time + TIMELINE_MIN_CLIP_SEC);
}

export function parseClipSegmentMeta(clipId: string): {
  segmentType: 'translation' | 'transcript';
  index: number;
} | null {
  const match = clipId.match(/^(translation|transcript)-(\d+)$/);
  if (!match) return null;
  return {
    segmentType: match[1] as 'translation' | 'transcript',
    index: parseInt(match[2], 10),
  };
}
