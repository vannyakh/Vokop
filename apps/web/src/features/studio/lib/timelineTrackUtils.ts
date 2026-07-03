import type { TimelineTrackId } from '@/features/studio/lib/timelineTypes';

export function isOverlayTimelineTrack(trackId: TimelineTrackId | string | undefined): boolean {
  if (!trackId) return false;
  const id = String(trackId);
  return id === 'overlay' || id.startsWith('overlay-');
}

export function isEditableTimelineTrack(trackId: TimelineTrackId | string | undefined): boolean {
  if (!trackId) return false;
  const id = String(trackId);
  return id === 'text' || id === 'video' || id === 'audio' || isOverlayTimelineTrack(id);
}
