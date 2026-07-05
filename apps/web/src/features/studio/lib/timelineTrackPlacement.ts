import type {
  ExtraTimelineTrack,
  ExtraTrackType,
  MediaClip,
  TimelineTrackType,
} from '@/features/studio/lib/timelineTypes';
import { DEFAULT_TIMELINE_TRACK_ORDER } from '@/features/studio/lib/timelineTypes';
import {
  isAudioLikeTimelineTrack,
  isTextTimelineTrack,
  isVideoTimelineTrack,
  isVisualTimelineTrack,
} from '@/features/studio/lib/timelineTrackUtils';
import type { CanvasElement } from '@/types/canvas';

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

export interface TimelinePlacementInput {
  trackId: string;
  trackType: TimelineTrackType;
  atTime: number;
  duration: number;
  mediaKind?: 'video' | 'audio' | 'image';
  excludeClipId?: string;
}

export interface TimelinePlacementState {
  videoClips: MediaClip[];
  audioClips: MediaClip[];
  canvasElements: CanvasElement[];
  timelineTrackOrder: string[];
  timelineTrackHidden: string[];
  extraTimelineTracks: ExtraTimelineTrack[];
}

export function normalizeTimelinePlacementTrackId(input: TimelinePlacementInput): string {
  const { trackId, trackType, mediaKind } = input;
  if (mediaKind === 'video' || trackType === 'video') {
    return isVideoTimelineTrack(trackId) ? trackId : 'video';
  }
  if (mediaKind === 'audio' || trackType === 'audio' || trackType === 'sound') {
    if (isAudioLikeTimelineTrack(trackId)) return trackId;
    return trackType === 'sound' ? 'sound' : 'audio';
  }
  if (trackType === 'text' || isTextTimelineTrack(trackId)) {
    return isTextTimelineTrack(trackId) ? trackId : 'text';
  }
  if (isVisualTimelineTrack(trackId) || trackType === 'image' || trackType === 'sticker' || trackType === 'effect') {
    if (isVisualTimelineTrack(trackId)) {
      return trackId === 'overlay' || trackId.startsWith('overlay-') ? 'image' : trackId;
    }
    if (trackType === 'sticker') return 'sticker';
    if (trackType === 'effect') return 'effect';
    return 'image';
  }
  return trackId;
}

export function extraTrackTypeForPlacement(input: TimelinePlacementInput): ExtraTrackType {
  const { trackType, mediaKind } = input;
  if (mediaKind === 'video' || trackType === 'video') return 'video';
  if (trackType === 'sound') return 'sound';
  if (mediaKind === 'audio' || trackType === 'audio') return 'audio';
  if (trackType === 'text') return 'text';
  if (trackType === 'sticker') return 'sticker';
  if (trackType === 'effect') return 'effect';
  return 'image';
}

export function trackTypeMatchesPlacement(trackId: string, input: TimelinePlacementInput): boolean {
  const { trackType, mediaKind } = input;
  if (mediaKind === 'video' || trackType === 'video') return isVideoTimelineTrack(trackId);
  if (mediaKind === 'audio' || trackType === 'audio' || trackType === 'sound') {
    if (trackType === 'sound') return trackId === 'sound' || trackId.startsWith('sound-');
    if (trackType === 'audio') return trackId === 'audio' || trackId.startsWith('audio-');
    return isAudioLikeTimelineTrack(trackId);
  }
  if (trackType === 'text' || isTextTimelineTrack(trackId)) return isTextTimelineTrack(trackId);
  if (trackType === 'sticker') return trackId === 'sticker' || trackId.startsWith('sticker-');
  if (trackType === 'effect') return trackId === 'effect' || trackId.startsWith('effect-');
  if (trackType === 'image') {
    return (
      trackId === 'image' ||
      trackId.startsWith('image-') ||
      trackId === 'overlay' ||
      trackId.startsWith('overlay-')
    );
  }
  return isVisualTimelineTrack(trackId);
}

export function hasTimelinePlacementOverlap(
  state: TimelinePlacementState,
  trackId: string,
  input: TimelinePlacementInput,
): boolean {
  const { atTime, duration, mediaKind, trackType, excludeClipId } = input;
  if (mediaKind === 'video' || trackType === 'video') {
    return hasMediaTrackOverlap(state.videoClips, trackId, atTime, duration, 'video', excludeClipId);
  }
  if (mediaKind === 'audio' || trackType === 'audio' || trackType === 'sound') {
    return hasMediaTrackOverlap(state.audioClips, trackId, atTime, duration, 'audio', excludeClipId);
  }
  return hasCanvasTrackOverlap(
    state.canvasElements,
    trackId,
    atTime,
    atTime + duration,
    excludeClipId,
  );
}

export function orderedCompatibleTracks(
  state: TimelinePlacementState,
  input: TimelinePlacementInput,
): string[] {
  const order =
    state.timelineTrackOrder.length > 0
      ? state.timelineTrackOrder
      : [...DEFAULT_TIMELINE_TRACK_ORDER];
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const id of order) {
    if (state.timelineTrackHidden.includes(id)) continue;
    if (!trackTypeMatchesPlacement(id, input)) continue;
    if (seen.has(id)) continue;
    ids.push(id);
    seen.add(id);
  }

  for (const extra of state.extraTimelineTracks) {
    if (!trackTypeMatchesPlacement(extra.id, input)) continue;
    if (seen.has(extra.id)) continue;
    ids.push(extra.id);
    seen.add(extra.id);
  }

  return ids;
}

export interface TimelineTrackPlacementPick {
  trackId: string;
  needsNewTrack: boolean;
  insertAfter: string;
}

/**
 * Pick a compatible track without overlap. Reuses a lower empty slot when possible;
 * otherwise signals that a new track should be inserted below `insertAfter`.
 */
export function pickTimelineTrackForPlacement(
  state: TimelinePlacementState,
  input: TimelinePlacementInput,
): TimelineTrackPlacementPick {
  const trackId = normalizeTimelinePlacementTrackId(input);
  const placementInput = { ...input, trackId };

  if (!hasTimelinePlacementOverlap(state, trackId, placementInput)) {
    return { trackId, needsNewTrack: false, insertAfter: trackId };
  }

  const compatible = orderedCompatibleTracks(state, placementInput);
  const startIdx = Math.max(0, compatible.indexOf(trackId));

  for (let i = startIdx + 1; i < compatible.length; i++) {
    const candidate = compatible[i];
    if (!hasTimelinePlacementOverlap(state, candidate, placementInput)) {
      return { trackId: candidate, needsNewTrack: false, insertAfter: candidate };
    }
  }

  const insertAfter = compatible[compatible.length - 1] ?? trackId;
  return { trackId, needsNewTrack: true, insertAfter };
}

/** Map a resolved track id to canvas element storage (core ids are stored as undefined). */
export function canvasTrackIdFromResolved(resolvedTrackId: string): string | undefined {
  if (resolvedTrackId === 'text' || resolvedTrackId === 'image') return undefined;
  return resolvedTrackId;
}
