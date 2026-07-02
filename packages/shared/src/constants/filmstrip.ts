export const FILMSTRIP_THUMB_WIDTH = 72;
export const FILMSTRIP_THUMB_HEIGHT = 40;
export const FILMSTRIP_MAX_THUMBS = 24;
export const FILMSTRIP_MIN_THUMBS = 6;

export function getFilmstripFrameCount(duration: number): number {
  return Math.min(
    FILMSTRIP_MAX_THUMBS,
    Math.max(FILMSTRIP_MIN_THUMBS, Math.ceil(duration / 2)),
  );
}
