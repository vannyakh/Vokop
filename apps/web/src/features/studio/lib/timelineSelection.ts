import type { TimelineSelectionItem } from '@/features/studio/lib/timelineTypes';

export interface TimelineSelectionState {
  selectedTimelineClip: TimelineSelectionItem | null;
  selectedTimelineClips: TimelineSelectionItem[];
}

export type TimelineSelectMode = 'replace' | 'add' | 'toggle';

export function timelineSelectionKey(item: TimelineSelectionItem): string {
  return `${item.trackId}::${item.clipId}`;
}

export function sameTimelineSelectionItem(
  a: TimelineSelectionItem,
  b: TimelineSelectionItem,
): boolean {
  return a.trackId === b.trackId && a.clipId === b.clipId;
}

/** Prefer multi-select list; fall back to primary. */
export function resolveTimelineSelectionItems(
  primary: TimelineSelectionItem | null | undefined,
  items: TimelineSelectionItem[] | undefined,
): TimelineSelectionItem[] {
  if (items && items.length > 0) return items;
  return primary ? [primary] : [];
}

/** Normalize primary + list so they always stay in sync. */
export function buildTimelineSelection(
  items: TimelineSelectionItem[],
  primary?: TimelineSelectionItem | null,
): TimelineSelectionState {
  const seen = new Set<string>();
  const unique: TimelineSelectionItem[] = [];
  for (const item of items) {
    const key = timelineSelectionKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  if (unique.length === 0) {
    return { selectedTimelineClip: null, selectedTimelineClips: [] };
  }

  const primaryItem =
    primary && unique.some((i) => sameTimelineSelectionItem(i, primary))
      ? primary
      : unique[unique.length - 1]!;

  return {
    selectedTimelineClip: primaryItem,
    selectedTimelineClips: unique,
  };
}

export function toggleTimelineSelectionItem(
  current: TimelineSelectionItem[],
  item: TimelineSelectionItem,
  primary: TimelineSelectionItem | null,
): TimelineSelectionState {
  const exists = current.some((c) => sameTimelineSelectionItem(c, item));
  if (exists) {
    const next = current.filter((c) => !sameTimelineSelectionItem(c, item));
    const nextPrimary =
      primary && sameTimelineSelectionItem(primary, item) ? null : primary;
    return buildTimelineSelection(next, nextPrimary);
  }
  return buildTimelineSelection([...current, item], item);
}

/** Drop clips matching `shouldRemove` and keep selection consistent. */
export function pruneTimelineSelection(
  primary: TimelineSelectionItem | null | undefined,
  items: TimelineSelectionItem[] | undefined,
  shouldRemove: (item: TimelineSelectionItem) => boolean,
): TimelineSelectionState {
  const resolved = resolveTimelineSelectionItems(primary, items);
  return buildTimelineSelection(resolved.filter((item) => !shouldRemove(item)));
}

export function isTimelineItemSelected(
  primary: TimelineSelectionItem | null | undefined,
  items: TimelineSelectionItem[] | undefined,
  trackId: TimelineSelectionItem['trackId'],
  clipId: string,
): boolean {
  return resolveTimelineSelectionItems(primary, items).some(
    (c) => c.trackId === trackId && c.clipId === clipId,
  );
}

/** Every clip on visible timeline tracks (for select-all). */
export function collectAllTimelineSelectionItems(
  tracks: { id: string; clips: { id: string }[] }[],
): TimelineSelectionItem[] {
  return tracks.flatMap((track) =>
    track.clips.map((clip) => ({
      trackId: track.id as TimelineSelectionItem['trackId'],
      clipId: clip.id,
    })),
  );
}
