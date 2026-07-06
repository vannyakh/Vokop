import { FILMSTRIP_THUMB_HEIGHT, FILMSTRIP_THUMB_WIDTH } from '@vokop/shared';
import { isCompactTrackHeight } from '@/features/studio/lib/timelineTypes';

/** CapCut-style filmstrip band height for a video lane (frames above embedded waveform). */
export function resolveFilmstripBandHeight(laneHeight: number): number {
  const clipHeight = Math.max(1, laneHeight - 4);
  if (isCompactTrackHeight(laneHeight)) return clipHeight;
  return Math.max(FILMSTRIP_THUMB_HEIGHT, Math.round(clipHeight * 0.58));
}

/** How many thumb slots to render for a clip block width. */
export function filmstripSlotCount(clipPixelWidth: number, thumbWidth = FILMSTRIP_THUMB_WIDTH): number {
  return Math.max(1, Math.ceil(clipPixelWidth / thumbWidth));
}

/** Sample filmstrip frames for a clip's source range and tile across its width. */
export function filmstripThumbsForClip(
  thumbnails: string[],
  mediaDurationSec: number,
  clip: { sourceStart?: number; duration: number },
  clipPixelWidth: number,
  thumbWidth = FILMSTRIP_THUMB_WIDTH,
): string[] {
  if (!thumbnails.length || mediaDurationSec <= 0 || clip.duration <= 0) {
    return [];
  }

  const sourceStart = Math.max(0, clip.sourceStart ?? 0);
  const slots = filmstripSlotCount(clipPixelWidth, thumbWidth);
  const result: string[] = [];

  for (let i = 0; i < slots; i++) {
    const t = sourceStart + (clip.duration * (i + 0.5)) / slots;
    const ratio = Math.min(1, Math.max(0, t / mediaDurationSec));
    const idx = Math.min(
      thumbnails.length - 1,
      Math.max(0, Math.floor(ratio * thumbnails.length)),
    );
    result.push(thumbnails[idx]!);
  }

  return result;
}
