import type {
  TimelineClipModel,
  TimelineTrackId,
  TimelineTrackModel,
  TimelineTrackType,
} from '@/features/studio/lib/timelineTypes';
import { DEFAULT_TIMELINE_TRACK_ORDER } from '@/features/studio/lib/timelineTypes';

/** Whether a clip can be moved onto a destination track (drag or menu). */
export function clipCanMoveToTrack(
  clip: TimelineClipModel,
  toTrackId: string,
  toType: TimelineTrackType,
): boolean {
  if (clip.mediaKind === 'video') return toType === 'video' || toTrackId === 'video';
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
