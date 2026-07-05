/** Map pointer position to canvas-local coordinates (handles CSS scale transforms). */
export function clientToCanvas(
  wrap: HTMLElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = wrap.getBoundingClientRect();
  const logicalW = wrap.offsetWidth || rect.width;
  const logicalH = wrap.offsetHeight || rect.height;
  return {
    x: ((clientX - rect.left) / rect.width) * logicalW,
    y: ((clientY - rect.top) / rect.height) * logicalH,
  };
}

export type CanvasRect = { x: number; y: number; width: number; height: number };

/** Visible video area inside the preview frame (object-fit: contain). */
export function getVideoContentRect(
  stage: { width: number; height: number },
  videoSize: { width: number; height: number },
  frameRatio?: number | null,
): CanvasRect {
  const sw = stage.width;
  const sh = stage.height;
  if (sw <= 0 || sh <= 0) return { x: 0, y: 0, width: sw, height: sh };

  let aspect: number;
  if (frameRatio != null && frameRatio > 0) {
    aspect = frameRatio;
  } else if (videoSize.width > 0 && videoSize.height > 0) {
    aspect = videoSize.width / videoSize.height;
  } else {
    return { x: 0, y: 0, width: sw, height: sh };
  }

  const stageAspect = sw / sh;
  if (Math.abs(aspect - stageAspect) < 0.02) {
    return { x: 0, y: 0, width: sw, height: sh };
  }

  if (aspect >= stageAspect) {
    const w = sw;
    const h = w / aspect;
    return { x: 0, y: (sh - h) / 2, width: w, height: h };
  }
  const h = sh;
  const w = h * aspect;
  return { x: (sw - w) / 2, y: 0, width: w, height: h };
}

export function clampCanvasPoint(
  x: number,
  y: number,
  size: { width: number; height: number },
  stage: { width: number; height: number },
  pad = 24,
) {
  return clampToContentRect(x, y, size, { x: pad, y: pad, width: stage.width - pad * 2, height: stage.height - pad * 2 }, 0);
}

export function clampToContentRect(
  x: number,
  y: number,
  size: { width: number; height: number },
  content: CanvasRect,
  pad = 4,
): { x: number; y: number } {
  const minX = content.x + pad;
  const minY = content.y + pad;
  const maxX = Math.max(minX, content.x + content.width - size.width - pad);
  const maxY = Math.max(minY, content.y + content.height - size.height - pad);
  return {
    x: Math.min(Math.max(minX, x), maxX),
    y: Math.min(Math.max(minY, y), maxY),
  };
}

/** Keep a box fully inside the composition frame (position + max size). */
export function clampBoxToContentRect(
  box: { x: number; y: number; width: number; height: number },
  content: CanvasRect,
  pad = 4,
  minSize: { width: number; height: number } = { width: 40, height: 24 },
): { x: number; y: number; width: number; height: number } {
  const innerW = Math.max(minSize.width, content.width - pad * 2);
  const innerH = Math.max(minSize.height, content.height - pad * 2);
  const minX = content.x + pad;
  const minY = content.y + pad;
  const maxX = content.x + content.width - pad;
  const maxY = content.y + content.height - pad;

  let width = Math.max(minSize.width, Math.min(box.width, innerW));
  let height = Math.max(minSize.height, Math.min(box.height, innerH));
  let x = Math.min(Math.max(minX, box.x), maxX - width);
  let y = Math.min(Math.max(minY, box.y), maxY - height);
  return { x, y, width, height };
}

/**
 * Fraction-space composition coordinates (Omniclip-style resize fix).
 *
 * `MediaClip`/`CanvasElement` x/y/width/height/fontSize are stored as fractions
 * of the current video content rect (0..1, can exceed 1 for oversized elements)
 * instead of live on-screen pixels. Converting to/from pixels is a stateless
 * multiplication done at render/write time using whatever `contentRect` is
 * right now — no resize-triggered remap, no store write.
 */
export type FractionBox = { x: number; y: number; width: number; height: number };

/** fraction (0..1 of contentRect) -> live on-screen px. */
export function toPxBox(box: FractionBox, content: CanvasRect): CanvasRect {
  return {
    x: content.x + box.x * content.width,
    y: content.y + box.y * content.height,
    width: box.width * content.width,
    height: box.height * content.height,
  };
}

/** live on-screen px -> fraction (0..1 of contentRect). */
export function toFractionBox(box: CanvasRect, content: CanvasRect): FractionBox {
  if (content.width <= 0 || content.height <= 0) return { x: 0, y: 0, width: 0, height: 0 };
  return {
    x: (box.x - content.x) / content.width,
    y: (box.y - content.y) / content.height,
    width: box.width / content.width,
    height: box.height / content.height,
  };
}

export function toPxPoint(point: { x: number; y: number }, content: CanvasRect): { x: number; y: number } {
  return { x: content.x + point.x * content.width, y: content.y + point.y * content.height };
}

export function toFractionPoint(point: { x: number; y: number }, content: CanvasRect): { x: number; y: number } {
  if (content.width <= 0 || content.height <= 0) return { x: 0, y: 0 };
  return { x: (point.x - content.x) / content.width, y: (point.y - content.y) / content.height };
}

/** fraction of contentRect.height -> px (used for fontSize). */
export function toPxFontSize(fraction: number, content: CanvasRect): number {
  return fraction * content.height;
}

export function toFractionFontSize(px: number, content: CanvasRect): number {
  return content.height > 0 ? px / content.height : 0;
}

/**
 * Stable reference size for converting a fraction to a "nominal px" number for
 * display/editing in inspector panels that don't have a live contentRect
 * (e.g. sidebar sliders). Unlike the live contentRect, this only changes when
 * the project's video resolution changes — not on every window/pane resize.
 */
export function frameReferenceSize(
  videoWidth: number,
  videoHeight: number,
): { width: number; height: number } {
  if (videoWidth > 0 && videoHeight > 0) return { width: videoWidth, height: videoHeight };
  return { width: 1920, height: 1080 };
}

export function centerInContentRect(
  size: { width: number; height: number },
  content: CanvasRect,
): { x: number; y: number } {
  return clampToContentRect(
    content.x + (content.width - size.width) / 2,
    content.y + (content.height - size.height) / 2,
    size,
    content,
  );
}
