import type { CanvasElement } from '@/types/canvas';

export interface CanvasGuideLine {
  orientation: 'horizontal' | 'vertical';
  position: number;
  /** True when actively snapping to this line. */
  snapped?: boolean;
  /** Frame guides (video content rect) vs center-only axis. */
  kind?: 'frame' | 'axis' | 'snap';
}

/** Generic bounds peer for attach-snap (overlays, video proxy, etc.). */
export interface SnapPeer {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const SNAP_THRESHOLD = 8;

export function elementToSnapPeer(el: CanvasElement): SnapPeer {
  const height =
    el.type === 'logo' || el.type === 'image' ? el.height : el.fontSize * 1.6;
  return { id: el.id, x: el.x, y: el.y, width: el.width, height };
}

function snapAxis(
  origin: number,
  size: number,
  targets: number[],
  threshold: number,
): { origin: number; guide: number | null } {
  const anchors = [
    { point: origin },
    { point: origin + size / 2 },
    { point: origin + size },
  ];

  let bestOrigin = origin;
  let bestDist = threshold + 1;
  let bestGuide: number | null = null;

  for (const anchor of anchors) {
    for (const target of targets) {
      const dist = Math.abs(anchor.point - target);
      if (dist <= threshold && dist < bestDist) {
        bestDist = dist;
        bestOrigin = origin + (target - anchor.point);
        bestGuide = target;
      }
    }
  }

  return { origin: bestOrigin, guide: bestGuide };
}

function snapEdge(
  value: number,
  targets: number[],
  threshold: number,
): { value: number; guide: number | null } {
  let best = value;
  let bestDist = threshold + 1;
  let bestGuide: number | null = null;

  for (const target of targets) {
    const dist = Math.abs(value - target);
    if (dist <= threshold && dist < bestDist) {
      bestDist = dist;
      best = target;
      bestGuide = target;
    }
  }

  return { value: best, guide: bestGuide };
}

function buildTargets(
  bounds: { x: number; y: number; width: number; height: number },
  others: SnapPeer[],
  excludeId: string,
) {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const right = bounds.x + bounds.width;
  const bottom = bounds.y + bounds.height;
  const vertical = [cx, bounds.x, right];
  const horizontal = [cy, bounds.y, bottom];

  for (const el of others) {
    if (el.id === excludeId) continue;
    vertical.push(el.x, el.x + el.width / 2, el.x + el.width);
    horizontal.push(el.y, el.y + el.height / 2, el.y + el.height);
  }

  return { vertical, horizontal };
}

/** Center crosshair of the composition frame. */
export function getPreviewAxisGuides(bounds: {
  x: number;
  y: number;
  width: number;
  height: number;
}): CanvasGuideLine[] {
  return [
    {
      orientation: 'vertical',
      position: bounds.x + bounds.width / 2,
      kind: 'axis',
    },
    {
      orientation: 'horizontal',
      position: bounds.y + bounds.height / 2,
      kind: 'axis',
    },
  ];
}

/** Full video-frame guides: edges + center (CapCut-style). */
export function getFrameGuideLines(bounds: {
  x: number;
  y: number;
  width: number;
  height: number;
}): CanvasGuideLine[] {
  return [
    { orientation: 'vertical', position: bounds.x, kind: 'frame' },
    {
      orientation: 'vertical',
      position: bounds.x + bounds.width / 2,
      kind: 'frame',
    },
    {
      orientation: 'vertical',
      position: bounds.x + bounds.width,
      kind: 'frame',
    },
    { orientation: 'horizontal', position: bounds.y, kind: 'frame' },
    {
      orientation: 'horizontal',
      position: bounds.y + bounds.height / 2,
      kind: 'frame',
    },
    {
      orientation: 'horizontal',
      position: bounds.y + bounds.height,
      kind: 'frame',
    },
  ];
}

export type SnapAxisMode = 'none' | 'center' | 'frame';

function baseGuides(
  bounds: { x: number; y: number; width: number; height: number },
  axisMode: SnapAxisMode,
): CanvasGuideLine[] {
  if (axisMode === 'frame') return getFrameGuideLines(bounds);
  if (axisMode === 'center') return getPreviewAxisGuides(bounds);
  return [];
}

export function snapDragPosition(
  pos: { x: number; y: number },
  size: { width: number; height: number },
  bounds: { x: number; y: number; width: number; height: number },
  others: SnapPeer[],
  excludeId: string,
  attach: boolean,
  axisMode: SnapAxisMode | boolean = 'center',
): { x: number; y: number; guides: CanvasGuideLine[] } {
  // Legacy boolean: true = center axis, false = none.
  const mode: SnapAxisMode =
    typeof axisMode === 'boolean' ? (axisMode ? 'center' : 'none') : axisMode;

  const guides = baseGuides(bounds, mode);
  if (!attach) return { ...pos, guides };

  const { vertical, horizontal } = buildTargets(bounds, others, excludeId);
  const snapX = snapAxis(pos.x, size.width, vertical, SNAP_THRESHOLD);
  const snapY = snapAxis(pos.y, size.height, horizontal, SNAP_THRESHOLD);

  if (snapX.guide != null) {
    guides.push({
      orientation: 'vertical',
      position: snapX.guide,
      snapped: true,
      kind: 'snap',
    });
  }
  if (snapY.guide != null) {
    guides.push({
      orientation: 'horizontal',
      position: snapY.guide,
      snapped: true,
      kind: 'snap',
    });
  }

  return { x: snapX.origin, y: snapY.origin, guides };
}

/** Snap a box's edges to the frame and peers (move + resize). */
export function snapBoxEdges(
  box: { x: number; y: number; width: number; height: number },
  bounds: { x: number; y: number; width: number; height: number },
  others: SnapPeer[],
  excludeId: string,
  attach: boolean,
  axisMode: SnapAxisMode = 'frame',
): { box: { x: number; y: number; width: number; height: number }; guides: CanvasGuideLine[] } {
  const guides = baseGuides(bounds, axisMode);
  if (!attach) return { box, guides };

  const { vertical, horizontal } = buildTargets(bounds, others, excludeId);
  let { x, y, width, height } = box;

  const left = snapEdge(x, vertical, SNAP_THRESHOLD);
  const right = snapEdge(x + width, vertical, SNAP_THRESHOLD);
  const top = snapEdge(y, horizontal, SNAP_THRESHOLD);
  const bottom = snapEdge(y + height, horizontal, SNAP_THRESHOLD);

  if (left.guide != null && right.guide != null) {
    x = left.value;
    width = Math.max(48, right.value - left.value);
    guides.push(
      { orientation: 'vertical', position: left.guide, snapped: true, kind: 'snap' },
      { orientation: 'vertical', position: right.guide, snapped: true, kind: 'snap' },
    );
  } else if (left.guide != null) {
    const dx = left.value - x;
    x = left.value;
    width = Math.max(48, width - dx);
    guides.push({
      orientation: 'vertical',
      position: left.guide,
      snapped: true,
      kind: 'snap',
    });
  } else if (right.guide != null) {
    width = Math.max(48, right.value - x);
    guides.push({
      orientation: 'vertical',
      position: right.guide,
      snapped: true,
      kind: 'snap',
    });
  }

  if (top.guide != null && bottom.guide != null) {
    y = top.value;
    height = Math.max(48, bottom.value - top.value);
    guides.push(
      { orientation: 'horizontal', position: top.guide, snapped: true, kind: 'snap' },
      { orientation: 'horizontal', position: bottom.guide, snapped: true, kind: 'snap' },
    );
  } else if (top.guide != null) {
    const dy = top.value - y;
    y = top.value;
    height = Math.max(48, height - dy);
    guides.push({
      orientation: 'horizontal',
      position: top.guide,
      snapped: true,
      kind: 'snap',
    });
  } else if (bottom.guide != null) {
    height = Math.max(48, bottom.value - y);
    guides.push({
      orientation: 'horizontal',
      position: bottom.guide,
      snapped: true,
      kind: 'snap',
    });
  }

  // Center snap when edges did not lock.
  if (left.guide == null && right.guide == null) {
    const mid = snapAxis(x, width, vertical, SNAP_THRESHOLD);
    if (mid.guide != null) {
      x = mid.origin;
      guides.push({
        orientation: 'vertical',
        position: mid.guide,
        snapped: true,
        kind: 'snap',
      });
    }
  }
  if (top.guide == null && bottom.guide == null) {
    const mid = snapAxis(y, height, horizontal, SNAP_THRESHOLD);
    if (mid.guide != null) {
      y = mid.origin;
      guides.push({
        orientation: 'horizontal',
        position: mid.guide,
        snapped: true,
        kind: 'snap',
      });
    }
  }

  return { box: { x, y, width, height }, guides };
}
