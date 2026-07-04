import type { MediaAssetKind } from '@/features/studio/lib/mediaLibrary';
import { MEDIA_ASSET_DRAG_MIME } from '@/features/studio/lib/mediaLibrary';
import { TEXT_TEMPLATE_DRAG_MIME } from '@/features/studio/constants/textTemplates';
import type { TimelineTrackType } from '@/features/studio/lib/timelineTypes';
import {
  isAudioLikeTimelineTrack,
  isTextTimelineTrack,
  isVisualTimelineTrack,
} from '@/features/studio/lib/timelineTrackUtils';

/** Secondary drag type so lanes can accept/reject before drop. */
export const MEDIA_KIND_DRAG_PREFIX = 'application/x-vokop-media-kind-';

export function mediaKindDragType(kind: MediaAssetKind): string {
  return `${MEDIA_KIND_DRAG_PREFIX}${kind}`;
}

export type TimelineDropSource = 'media' | 'template' | 'files' | 'unknown';

export function getTimelineDropSource(types: readonly string[]): TimelineDropSource {
  if (types.includes(MEDIA_ASSET_DRAG_MIME)) return 'media';
  if (types.includes(TEXT_TEMPLATE_DRAG_MIME)) return 'template';
  if (types.includes('Files')) return 'files';
  return 'unknown';
}

export function isTimelineExternalDrag(types: readonly string[]): boolean {
  return getTimelineDropSource(types) !== 'unknown';
}

export function getDragMediaKind(types: readonly string[]): MediaAssetKind | null {
  if (types.includes(mediaKindDragType('video'))) return 'video';
  if (types.includes(mediaKindDragType('audio'))) return 'audio';
  if (types.includes(mediaKindDragType('image'))) return 'image';
  return null;
}

/** Whether a track can accept the current external drag payload. */
export function trackAcceptsDrop(
  trackId: string,
  trackType: TimelineTrackType,
  types: readonly string[],
): boolean {
  const source = getTimelineDropSource(types);
  if (source === 'unknown') return false;

  if (source === 'template') {
    return isTextTimelineTrack(trackId) || trackType === 'text';
  }

  if (source === 'media') {
    const kind = getDragMediaKind(types);
    if (!kind) return true;
    return trackAcceptsMediaKind(trackId, trackType, kind);
  }

  // OS files — media-capable tracks only.
  return (
    trackType === 'video' ||
    trackType === 'audio' ||
    trackType === 'sound' ||
    trackType === 'image' ||
    trackType === 'sticker' ||
    trackType === 'overlay' ||
    isVisualTimelineTrack(trackId) ||
    isAudioLikeTimelineTrack(trackId)
  );
}

export function trackAcceptsMediaKind(
  trackId: string,
  trackType: TimelineTrackType,
  kind: MediaAssetKind,
): boolean {
  if (kind === 'video') return trackType === 'video' || trackId === 'video';
  if (kind === 'audio') {
    return (
      trackType === 'audio' ||
      trackType === 'sound' ||
      isAudioLikeTimelineTrack(trackId)
    );
  }
  if (kind === 'image') {
    return (
      trackType === 'image' ||
      trackType === 'sticker' ||
      trackType === 'overlay' ||
      isVisualTimelineTrack(trackId)
    );
  }
  return false;
}

export function dropHintForTrack(
  trackId: string,
  trackType: TimelineTrackType,
  types: readonly string[],
): string {
  if (!trackAcceptsDrop(trackId, trackType, types)) {
    const source = getTimelineDropSource(types);
    if (source === 'template') return 'Drop on a text track';
    if (source === 'media') {
      const kind = getDragMediaKind(types);
      if (kind === 'video') return 'Drop on the video track';
      if (kind === 'audio') return 'Drop on an audio or sound track';
      if (kind === 'image') return 'Drop on an image or sticker track';
    }
    return 'Incompatible track';
  }
  const source = getTimelineDropSource(types);
  if (source === 'template') return 'Add text at playhead';
  if (source === 'media') {
    const kind = getDragMediaKind(types);
    if (kind === 'video') return 'Add video clip';
    if (kind === 'audio') {
      return trackType === 'sound' ? 'Add sound clip' : 'Add audio clip';
    }
    if (kind === 'image') {
      if (trackType === 'sticker') return 'Add sticker';
      if (trackType === 'effect') return 'Add effect media';
      return 'Add image';
    }
  }
  return 'Drop to add';
}
