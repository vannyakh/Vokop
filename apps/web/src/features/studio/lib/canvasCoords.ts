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

/** When the composition frame moves/resizes, remap a box proportionally inside it. */
export function remapBoxInContentRect(
  box: { x: number; y: number; width: number; height: number },
  from: CanvasRect,
  to: CanvasRect,
): { x: number; y: number; width: number; height: number } {
  if (from.width <= 0 || from.height <= 0 || to.width <= 0 || to.height <= 0) {
    return box;
  }
  const relX = (box.x - from.x) / from.width;
  const relY = (box.y - from.y) / from.height;
  const relW = box.width / from.width;
  const relH = box.height / from.height;
  return {
    x: to.x + relX * to.width,
    y: to.y + relY * to.height,
    width: Math.max(1, relW * to.width),
    height: Math.max(1, relH * to.height),
  };
}

export function compositionScale(from: CanvasRect, to: CanvasRect): number {
  if (from.width <= 0 || from.height <= 0 || to.width <= 0 || to.height <= 0) return 1;
  return Math.min(to.width / from.width, to.height / from.height);
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
