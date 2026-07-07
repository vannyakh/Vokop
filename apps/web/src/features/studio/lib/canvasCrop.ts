import type { CSSProperties } from 'react';
import {
  clampCropRect,
  combineCrop,
  FULL_CROP,
  isFullCrop,
  type NormalizedCropRect,
} from '@vokop/shared/types/crop';
import type { CanvasOrientedBox } from '@/features/studio/lib/canvasTransformUtils';

export { clampCropRect, combineCrop, FULL_CROP, isFullCrop };
export type { NormalizedCropRect };

/** CSS for media inside an overflow-hidden composition box. */
export function cropMediaInnerStyle(crop: NormalizedCropRect | undefined): CSSProperties {
  if (!crop || isFullCrop(crop)) return {};
  return {
    position: 'absolute',
    width: `${100 / crop.width}%`,
    height: `${100 / crop.height}%`,
    left: `${(-crop.x / crop.width) * 100}%`,
    top: `${(-crop.y / crop.height) * 100}%`,
    maxWidth: 'none',
    maxHeight: 'none',
  };
}

export function cropRectToPx(
  rect: NormalizedCropRect,
  box: CanvasOrientedBox,
): { x: number; y: number; width: number; height: number } {
  return {
    x: box.x + rect.x * box.width,
    y: box.y + rect.y * box.height,
    width: rect.width * box.width,
    height: rect.height * box.height,
  };
}

export function pxRectToNormalized(
  px: { x: number; y: number; width: number; height: number },
  box: CanvasOrientedBox,
): NormalizedCropRect {
  if (box.width <= 0 || box.height <= 0) return { ...FULL_CROP };
  return clampCropRect({
    x: (px.x - box.x) / box.width,
    y: (px.y - box.y) / box.height,
    width: px.width / box.width,
    height: px.height / box.height,
  });
}

/** Map stage pointer to box-local coords (top-left origin, unrotated). */
export function stagePointToBoxLocal(
  stageX: number,
  stageY: number,
  box: CanvasOrientedBox,
): { x: number; y: number } {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const rad = (-(box.rotation ?? 0) * Math.PI) / 180;
  const dx = stageX - cx;
  const dy = stageY - cy;
  return {
    x: dx * Math.cos(rad) - dy * Math.sin(rad) + box.width / 2,
    y: dx * Math.sin(rad) + dy * Math.cos(rad) + box.height / 2,
  };
}

export type CropHandle =
  | 'move'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right';

export function resizeCropFromHandle(
  start: NormalizedCropRect,
  handle: CropHandle,
  localPoint: { x: number; y: number },
  startLocal: { x: number; y: number },
  box: CanvasOrientedBox,
): NormalizedCropRect {
  const dx = (localPoint.x - startLocal.x) / box.width;
  const dy = (localPoint.y - startLocal.y) / box.height;

  let { x, y, width, height } = start;

  switch (handle) {
    case 'move':
      x += dx;
      y += dy;
      break;
    case 'top-left':
      x += dx;
      y += dy;
      width -= dx;
      height -= dy;
      break;
    case 'top-right':
      y += dy;
      width += dx;
      height -= dy;
      break;
    case 'bottom-left':
      x += dx;
      width -= dx;
      height += dy;
      break;
    case 'bottom-right':
      width += dx;
      height += dy;
      break;
    case 'top':
      y += dy;
      height -= dy;
      break;
    case 'bottom':
      height += dy;
      break;
    case 'left':
      x += dx;
      width -= dx;
      break;
    case 'right':
      width += dx;
      break;
    default:
      break;
  }

  return clampCropRect({ x, y, width, height });
}

export function getCursorForCropHandle(handle: CropHandle): string {
  switch (handle) {
    case 'move':
      return 'move';
    case 'top-left':
    case 'bottom-right':
      return 'nwse-resize';
    case 'top-right':
    case 'bottom-left':
      return 'nesw-resize';
    case 'top':
    case 'bottom':
      return 'ns-resize';
    case 'left':
    case 'right':
      return 'ew-resize';
    default:
      return 'default';
  }
}
