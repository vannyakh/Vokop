import type { CanvasElement } from '@/types/canvas';
import { toPxBox, toPxFontSize, type CanvasRect } from '@/features/studio/lib/canvasCoords';

export interface CanvasGuideLine {
  orientation: 'horizontal' | 'vertical';
  position: number;
  snapped?: boolean;
  kind?: 'frame' | 'axis' | 'snap';
}

export interface SnapPeer {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Project a fraction-space element to px snap peer bounds. */
export function elementToSnapPeer(el: CanvasElement, contentRect: CanvasRect): SnapPeer {
  const heightFraction =
    el.type === 'logo' || el.type === 'image' ? el.height : el.fontSize * 1.6;
  const box = toPxBox({ x: el.x, y: el.y, width: el.width, height: heightFraction }, contentRect);
  return { id: el.id, ...box };
}

function snapAxis(
  origin: number,
  size: number,
  targets: readonly number[],
  threshold: number,
): { origin: number; guide: number | null } {
  let bestOrigin = origin;
  let bestDist = threshold + 1;
  let bestGuide: number | null = null;

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    for (const anchor of [origin, origin + size / 2, origin + size]) {
      const dist = Math.abs(anchor - target);
      if (dist <= threshold && dist < bestDist) {
        bestDist = dist;
        bestOrigin = origin + (target - anchor);
        bestGuide = target;
      }
    }
  }

  return { origin: bestOrigin, guide: bestGuide };
}

/** Precompute peer attach targets (frame edges excluded — frame snap is handled separately). */
export function buildPeerTargets(
  others: readonly SnapPeer[],
  excludeId: string,
): { vertical: number[]; horizontal: number[] } {
  const vertical: number[] = [];
  const horizontal: number[] = [];

  for (let i = 0; i < others.length; i++) {
    const el = others[i];
    if (el.id === excludeId) continue;
    vertical.push(el.x, el.x + el.width / 2, el.x + el.width);
    horizontal.push(el.y, el.y + el.height / 2, el.y + el.height);
  }

  return { vertical, horizontal };
}

/** Snap to peer elements only (no frame guides allocated). */
export function snapPeerPosition(
  pos: { x: number; y: number },
  size: { width: number; height: number },
  peerTargets: { vertical: readonly number[]; horizontal: readonly number[] },
  threshold: number,
): { x: number; y: number; guides: CanvasGuideLine[] } {
  const guides: CanvasGuideLine[] = [];
  const snapX = snapAxis(pos.x, size.width, peerTargets.vertical, threshold);
  const snapY = snapAxis(pos.y, size.height, peerTargets.horizontal, threshold);

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

/** Full video-frame guides: edges + center. Returns a stable 6-item array. */
export function getFrameGuideLines(bounds: CanvasRect): readonly CanvasGuideLine[] {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const right = bounds.x + bounds.width;
  const bottom = bounds.y + bounds.height;
  return [
    { orientation: 'vertical', position: bounds.x, kind: 'frame' },
    { orientation: 'vertical', position: cx, kind: 'frame' },
    { orientation: 'vertical', position: right, kind: 'frame' },
    { orientation: 'horizontal', position: bounds.y, kind: 'frame' },
    { orientation: 'horizontal', position: cy, kind: 'frame' },
    { orientation: 'horizontal', position: bottom, kind: 'frame' },
  ];
}

export function guidesEqual(
  a: readonly CanvasGuideLine[] | null,
  b: readonly CanvasGuideLine[] | null,
): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ga = a[i];
    const gb = b[i];
    if (
      ga.orientation !== gb.orientation ||
      ga.position !== gb.position ||
      ga.snapped !== gb.snapped ||
      ga.kind !== gb.kind
    ) {
      return false;
    }
  }
  return true;
}
