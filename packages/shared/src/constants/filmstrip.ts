export const FILMSTRIP_THUMB_WIDTH = 72;
export const FILMSTRIP_THUMB_HEIGHT = 40;
export const FILMSTRIP_MAX_THUMBS = 48;
export const FILMSTRIP_MIN_THUMBS = 6;

/** One frame about every 0.5s of source media, capped for performance. */
export function getFilmstripFrameCount(duration: number): number {
  return Math.min(
    FILMSTRIP_MAX_THUMBS,
    Math.max(FILMSTRIP_MIN_THUMBS, Math.ceil(duration / 0.5)),
  );
}
