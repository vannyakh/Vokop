import type {
  ExtraTimelineTrack,
  MediaClip,
  TimelineClipModel,
  TimelineTrackId,
  TimelineTrackModel,
  TimelineTrackType,
} from '@/features/studio/lib/timelineTypes';
import { DEFAULT_TIMELINE_TRACK_ORDER } from '@/features/studio/lib/timelineTypes';
import type { MediaAssetKind } from '@/features/studio/lib/mediaLibrary';

/** Core timeline track id for a clip type when promoting from an extra lane. */
export function masterTrackIdForClip(clip: TimelineClipModel): 'video' | 'image' | null {
  if (clip.mediaKind === 'video') return 'video';
  if (clip.canvasKind === 'image' || clip.canvasKind === 'logo') return 'image';
  return null;
}

/** Whether a clip on `fromTrackId` can be promoted to its type's master track. */
export function clipCanPromoteToMaster(
  clip: TimelineClipModel,
  fromTrackId: string,
): boolean {
  const masterId = masterTrackIdForClip(clip);
  if (!masterId) return false;
  const from = String(fromTrackId);
  if (masterId === 'video') return from !== 'video';
  return from !== 'image';
}

/** Whether a clip can be moved onto a destination track (drag or menu). */
export function clipCanMoveToTrack(
  clip: TimelineClipModel,
  toTrackId: string,
  toType: TimelineTrackType,
): boolean {
  if (clip.mediaKind === 'video') {
    return toType === 'video' || toTrackId === 'video' || String(toTrackId).startsWith('video-');
  }
  if (clip.mediaKind === 'audio') return isAudioLikeTimelineTrack(toTrackId);
  if (clip.canvasKind === 'template' || clip.segmentType) {
    return isTextTimelineTrack(toTrackId) || toType === 'text';
  }
  if (clip.canvasKind === 'logo' || clip.canvasKind === 'image' || clip.canvasKind === 'sticker') {
    return isVisualTimelineTrack(toTrackId);
  }
  return false;
}

/** Visual tracks that hold images, stickers, effects, or legacy overlays. */
export function isVideoTimelineTrack(trackId: TimelineTrackId | string | undefined): boolean {
  if (!trackId) return false;
  const id = String(trackId);
  return id === 'video' || id.startsWith('video-');
}

/** Whether a footage track has at least one clip on the timeline. */
export function footageTrackHasClips(trackId: string, videoClips: MediaClip[]): boolean {
  if (trackId === 'video') {
    return videoClips.some((clip) => !clip.trackId || clip.trackId === 'video');
  }
  if (trackId.startsWith('video-')) {
    return videoClips.some((clip) => clip.trackId === trackId);
  }
  return false;
}

/** Drop empty extra footage tracks after clip deletes/moves. */
export function pruneEmptyExtraFootageTracks(state: {
  extraTimelineTracks: ExtraTimelineTrack[];
  videoClips: MediaClip[];
  timelineTrackOrder: string[];
  timelineTrackMuted: Record<string, boolean>;
  timelineTrackPreviewHidden: Record<string, boolean>;
  timelineTrackLabels: Record<string, string>;
}): Partial<typeof state> | null {
  const emptyIds = state.extraTimelineTracks
    .filter((track) => track.type === 'video')
    .filter((track) => !footageTrackHasClips(track.id, state.videoClips))
    .map((track) => track.id);
  if (emptyIds.length === 0) return null;

  const empty = new Set(emptyIds);
  const omit = <T extends Record<string, unknown>>(obj: T) =>
    Object.fromEntries(Object.entries(obj).filter(([key]) => !empty.has(key))) as T;

  return {
    extraTimelineTracks: state.extraTimelineTracks.filter((track) => !empty.has(track.id)),
    timelineTrackOrder: state.timelineTrackOrder.filter((id) => !empty.has(id)),
    timelineTrackMuted: omit(state.timelineTrackMuted),
    timelineTrackPreviewHidden: omit(state.timelineTrackPreviewHidden),
    timelineTrackLabels: omit(state.timelineTrackLabels),
  };
}

export function isVisualTimelineTrack(trackId: TimelineTrackId | string | undefined): boolean {
  if (!trackId) return false;
  const id = String(trackId);
  return (
    id === 'image' ||
    id === 'sticker' ||
    id === 'effect' ||
    id === 'overlay' ||
    id.startsWith('image-') ||
    id.startsWith('sticker-') ||
    id.startsWith('effect-') ||
    id.startsWith('overlay-')
  );
}

/** @deprecated Prefer isVisualTimelineTrack */
export function isOverlayTimelineTrack(trackId: TimelineTrackId | string | undefined): boolean {
  return isVisualTimelineTrack(trackId);
}

export function isAudioLikeTimelineTrack(trackId: TimelineTrackId | string | undefined): boolean {
  if (!trackId) return false;
  const id = String(trackId);
  return (
    id === 'audio' ||
    id === 'sound' ||
    id.startsWith('audio-') ||
    id.startsWith('sound-')
  );
}

export function isTextTimelineTrack(trackId: TimelineTrackId | string | undefined): boolean {
  if (!trackId) return false;
  const id = String(trackId);
  return id === 'text' || id.startsWith('text-');
}

export function isEditableTimelineTrack(trackId: TimelineTrackId | string | undefined): boolean {
  if (!trackId) return false;
  const id = String(trackId);
  return (
    id === 'video' ||
    isTextTimelineTrack(id) ||
    isAudioLikeTimelineTrack(id) ||
    isVisualTimelineTrack(id)
  );
}

export function trackTypeFromId(trackId: string, fallback: TimelineTrackType): TimelineTrackType {
  if (trackId === 'video' || trackId.startsWith('video-')) return 'video';
  if (isTextTimelineTrack(trackId)) return 'text';
  if (trackId === 'image' || trackId.startsWith('image-')) return 'image';
  if (trackId === 'sticker' || trackId.startsWith('sticker-')) return 'sticker';
  if (trackId === 'effect' || trackId.startsWith('effect-')) return 'effect';
  if (trackId === 'sound' || trackId.startsWith('sound-')) return 'sound';
  if (trackId === 'audio' || trackId.startsWith('audio-')) return 'audio';
  if (trackId === 'overlay' || trackId.startsWith('overlay-')) return 'overlay';
  return fallback;
}

/** Apply saved order; append any tracks missing from the order list. */
export function orderTimelineTracks(
  tracks: TimelineTrackModel[],
  order: string[],
): TimelineTrackModel[] {
  const byId = new Map(tracks.map((t) => [String(t.id), t]));
  const ordered: TimelineTrackModel[] = [];
  const sequence = order.length > 0 ? order : DEFAULT_TIMELINE_TRACK_ORDER;

  for (const id of sequence) {
    const track = byId.get(id);
    if (track) {
      ordered.push(track);
      byId.delete(id);
    }
  }
  for (const track of byId.values()) ordered.push(track);
  return ordered;
}

export function moveTrackInOrder(
  order: string[],
  trackIds: string[],
  fromId: string,
  toId: string,
): string[] {
  const base = order.length > 0 ? [...order] : [...trackIds];
  for (const id of trackIds) {
    if (!base.includes(id)) base.push(id);
  }
  const from = base.indexOf(fromId);
  const to = base.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return base;
  const next = [...base];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Resolve the core track id to show/unhide for a media kind + optional drop target. */
export function coreTrackIdForMediaKind(
  kind: MediaAssetKind,
  targetTrackId?: string,
  targetTrackType?: TimelineTrackType,
): string {
  if (kind === 'video') return 'video';
  if (kind === 'audio') {
    if (targetTrackType === 'sound' || targetTrackId === 'sound') return 'sound';
    return 'audio';
  }
  if (targetTrackType === 'sticker' || targetTrackId === 'sticker') return 'sticker';
  if (targetTrackId && isVisualTimelineTrack(targetTrackId)) return String(targetTrackId);
  return 'image';
}

export function trackTypeForMediaDrop(
  kind: MediaAssetKind,
  trackId: string,
): TimelineTrackType {
  if (kind === 'video') return 'video';
  if (kind === 'audio') return trackId === 'sound' ? 'sound' : 'audio';
  return trackTypeFromId(trackId, 'image');
}
