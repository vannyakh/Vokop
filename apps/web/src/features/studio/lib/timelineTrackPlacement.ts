import type { MediaClip } from '@/features/studio/lib/timelineTypes';

export function rangesOverlap(
  aStart: number,
  aDuration: number,
  bStart: number,
  bDuration: number,
): boolean {
  const aEnd = aStart + aDuration;
  const bEnd = bStart + bDuration;
  return aStart < bEnd && bStart < aEnd;
}

export function clipTrackId(clip: MediaClip, fallback: string): string {
  return clip.trackId ?? fallback;
}

/** Whether a new clip would overlap existing clips on the same track. */
export function hasMediaTrackOverlap(
  clips: MediaClip[],
  trackId: string,
  start: number,
  duration: number,
  fallbackTrackId: string,
  excludeClipId?: string,
): boolean {
  return clips.some((clip) => {
    if (excludeClipId && clip.id === excludeClipId) return false;
    if (clipTrackId(clip, fallbackTrackId) !== trackId) return false;
    return rangesOverlap(start, duration, clip.start, clip.duration);
  });
}

export function hasCanvasTrackOverlap(
  elements: Array<{ id: string; trackId?: string; startTime: number; endTime: number; type: string }>,
  trackId: string,
  start: number,
  end: number,
  excludeId?: string,
): boolean {
  return elements.some((el) => {
    if (excludeId && el.id === excludeId) return false;
    const tid =
      el.trackId ??
      (el.type === 'text' || el.type === 'overlay' ? 'text' : 'image');
    if (tid !== trackId) return false;
    return rangesOverlap(start, end - start, el.startTime, el.endTime - el.startTime);
  });
}

/** Insert a new track id directly below a reference track in the saved order. */
export function insertTrackBelowOrder(
  order: string[],
  refTrackId: string,
  newTrackId: string,
): string[] {
  const base = order.length > 0 ? [...order] : [];
  const idx = base.indexOf(refTrackId);
  if (idx >= 0) {
    base.splice(idx + 1, 0, newTrackId);
    return base;
  }
  return [...base, newTrackId];
}
