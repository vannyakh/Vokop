import type { CanvasElement } from '@/types/canvas';

export interface CanvasGuideLine {
  orientation: 'horizontal' | 'vertical';
  position: number;
  snapped?: boolean;
}

const PAD = 24;
const SNAP_THRESHOLD = 8;

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

function buildTargets(
  stage: { width: number; height: number },
  others: CanvasElement[],
  excludeId: string,
) {
  const vertical = [stage.width / 2, PAD, stage.width - PAD];
  const horizontal = [stage.height / 2, PAD, stage.height - PAD];

  for (const el of others) {
    if (el.id === excludeId) continue;
    vertical.push(el.x, el.x + el.width / 2, el.x + el.width);
    horizontal.push(el.y, el.y + el.height / 2, el.y + el.height);
  }

  return { vertical, horizontal };
}

export function getPreviewAxisGuides(stage: { width: number; height: number }): CanvasGuideLine[] {
  return [
    { orientation: 'vertical', position: stage.width / 2 },
    { orientation: 'horizontal', position: stage.height / 2 },
  ];
}

export function snapDragPosition(
  pos: { x: number; y: number },
  size: { width: number; height: number },
  stage: { width: number; height: number },
  others: CanvasElement[],
  excludeId: string,
  attach: boolean,
  showAxis: boolean,
): { x: number; y: number; guides: CanvasGuideLine[] } {
  const guides: CanvasGuideLine[] = showAxis ? getPreviewAxisGuides(stage) : [];
  if (!attach) return { ...pos, guides };

  const { vertical, horizontal } = buildTargets(stage, others, excludeId);
  const snapX = snapAxis(pos.x, size.width, vertical, SNAP_THRESHOLD);
  const snapY = snapAxis(pos.y, size.height, horizontal, SNAP_THRESHOLD);

  if (snapX.guide != null) {
    guides.push({ orientation: 'vertical', position: snapX.guide, snapped: true });
  }
  if (snapY.guide != null) {
    guides.push({ orientation: 'horizontal', position: snapY.guide, snapped: true });
  }

  return { x: snapX.origin, y: snapY.origin, guides };
}
