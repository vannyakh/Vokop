export interface CanvasOrientedBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

/** Normalize degrees to [-180, 180]. */
export function normalizeRotationDegrees(rotation: number): number {
  let r = rotation % 360;
  if (r > 180) r -= 360;
  if (r < -180) r += 360;
  return r;
}

/** Snap rotation when Shift is held (or always when `force` is true). */
export function snapRotationDegrees(
  rotation: number,
  options?: { shiftKey?: boolean; step?: number },
): number {
  const step = options?.step ?? 15;
  if (!options?.shiftKey && step !== 1) return normalizeRotationDegrees(rotation);
  return normalizeRotationDegrees(Math.round(rotation / step) * step);
}

/** Top-center point of a rotated rectangle in stage px (for floating toolbars). */
export function orientedBoxTopCenter(box: CanvasOrientedBox): { x: number; y: number } {
  const rotation = box.rotation ?? 0;
  if (Math.abs(rotation) < 0.01) {
    return { x: box.x + box.width / 2, y: box.y };
  }

  const rad = (rotation * Math.PI) / 180;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const hw = box.width / 2;
  const hh = box.height / 2;

  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ].map(({ x, y }) => ({
    x: cx + x * Math.cos(rad) - y * Math.sin(rad),
    y: cy + x * Math.sin(rad) + y * Math.cos(rad),
  }));

  const topY = Math.min(...corners.map((c) => c.y));
  const topCorners = corners.filter((c) => Math.abs(c.y - topY) < 1);
  const x =
    topCorners.reduce((sum, c) => sum + c.x, 0) / Math.max(1, topCorners.length);
  return { x, y: topY };
}

/** Bottom-center point — rotation handle anchor (CapCut-style, below selection). */
export function orientedBoxBottomCenter(box: CanvasOrientedBox): { x: number; y: number } {
  const rotation = box.rotation ?? 0;
  if (Math.abs(rotation) < 0.01) {
    return { x: box.x + box.width / 2, y: box.y + box.height };
  }

  const rad = (rotation * Math.PI) / 180;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const hw = box.width / 2;
  const hh = box.height / 2;

  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ].map(({ x, y }) => ({
    x: cx + x * Math.cos(rad) - y * Math.sin(rad),
    y: cy + x * Math.sin(rad) + y * Math.cos(rad),
  }));

  const bottomY = Math.max(...corners.map((c) => c.y));
  const bottomCorners = corners.filter((c) => Math.abs(c.y - bottomY) < 1);
  const x =
    bottomCorners.reduce((sum, c) => sum + c.x, 0) / Math.max(1, bottomCorners.length);
  return { x, y: bottomY };
}

export const CANVAS_ROTATION_SNAPS = [0, 45, 90, 135, 180, 225, 270, 315] as const;
