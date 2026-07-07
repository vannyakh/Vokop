/** Normalized crop rect (0..1) relative to uncropped media bounds. */
export interface NormalizedCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const FULL_CROP: NormalizedCropRect = { x: 0, y: 0, width: 1, height: 1 };

const MIN_CROP_SIZE = 0.05;

export function isFullCrop(crop: NormalizedCropRect | undefined | null): boolean {
  if (!crop) return true;
  return (
    crop.x <= 0.001 &&
    crop.y <= 0.001 &&
    crop.width >= 0.999 &&
    crop.height >= 0.999
  );
}

export function clampCropRect(rect: NormalizedCropRect): NormalizedCropRect {
  let { x, y, width, height } = rect;
  width = Math.max(MIN_CROP_SIZE, Math.min(1, width));
  height = Math.max(MIN_CROP_SIZE, Math.min(1, height));
  x = Math.min(Math.max(0, x), 1 - width);
  y = Math.min(Math.max(0, y), 1 - height);
  return { x, y, width, height };
}

/** Compose nested crop: `inner` is relative to `outer`'s visible region. */
export function combineCrop(
  outer: NormalizedCropRect,
  inner: NormalizedCropRect,
): NormalizedCropRect {
  return clampCropRect({
    x: outer.x + inner.x * outer.width,
    y: outer.y + inner.y * outer.height,
    width: outer.width * inner.width,
    height: outer.height * inner.height,
  });
}
