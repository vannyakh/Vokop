import { FILMSTRIP_THUMB_WIDTH } from '@vokop/shared';
import type { TimelineClipModel, TimelineTrackModel } from '@/features/studio/lib/timelineTypes';
import { filmstripSlotCount } from '@/features/studio/lib/timelineFilmstrip';
import type { CanvasElement } from '@/types/canvas';

export function isImagePreviewClip(
  clip: TimelineClipModel,
  track: TimelineTrackModel,
): boolean {
  if (
    clip.canvasKind === 'image' ||
    clip.canvasKind === 'logo' ||
    clip.canvasKind === 'sticker'
  ) {
    return track.type === 'image' || track.type === 'sticker' || track.type === 'overlay';
  }
  return false;
}

/** Resolve the image URL backing a canvas image/sticker clip. */
export function resolveTimelineImagePreviewSrc(
  clipId: string,
  canvasElements: CanvasElement[],
): string | null {
  const element = canvasElements.find((el) => el.id === clipId);
  if (!element?.src) return null;
  if (element.type !== 'image' && element.type !== 'logo') return null;
  return element.src;
}

/** Tile a static image across clip width (CapCut-style image track previews). */
export function imagePreviewThumbsForClip(
  src: string,
  clipPixelWidth: number,
  thumbWidth = FILMSTRIP_THUMB_WIDTH,
): string[] {
  const slots = filmstripSlotCount(clipPixelWidth, thumbWidth);
  return Array.from({ length: slots }, () => src);
}
