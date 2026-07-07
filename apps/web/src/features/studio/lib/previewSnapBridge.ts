import type Konva from 'konva';
import type { CanvasRect } from '@/features/studio/lib/canvasCoords';
import {
  buildPeerTargets,
  getFrameGuideLines,
  snapPeerPosition,
  type CanvasGuideLine,
  type SnapPeer,
} from '@/features/studio/lib/canvasSnap';
import {
  MIN_SCALE,
  SNAP_THRESHOLD_SCREEN_PIXELS,
  snapPosition,
  snapScale,
  snapScaleAxes,
  type ScaleEdgePreference,
  type SnapLine,
} from '@/features/studio/lib/previewSnap';

/** Cached per content-rect + zoom — avoids reallocating guides/threshold on every pointer move. */
export interface SnapSession {
  threshold: { x: number; y: number };
  frameGuides: readonly CanvasGuideLine[];
  canvasSize: { width: number; height: number };
  frameCx: number;
  frameCy: number;
}

export function createSnapSession(contentRect: CanvasRect, viewportZoom = 1): SnapSession {
  return {
    threshold: {
      x: SNAP_THRESHOLD_SCREEN_PIXELS / Math.max(viewportZoom, 0.001),
      y: SNAP_THRESHOLD_SCREEN_PIXELS / Math.max(viewportZoom, 0.001),
    },
    frameGuides: getFrameGuideLines(contentRect),
    canvasSize: { width: contentRect.width, height: contentRect.height },
    frameCx: contentRect.x + contentRect.width / 2,
    frameCy: contentRect.y + contentRect.height / 2,
  };
}

function snapLinesToCanvasGuides(
  lines: readonly SnapLine[],
  session: SnapSession,
): CanvasGuideLine[] {
  const out: CanvasGuideLine[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    out.push({
      orientation: line.type,
      position:
        line.type === 'vertical'
          ? session.frameCx + line.position
          : session.frameCy + line.position,
      snapped: true,
      kind: 'frame',
    });
  }
  return out;
}

interface RotationTrig {
  cos: number;
  sin: number;
}

function rotationTrig(rotationDeg: number): RotationTrig {
  const rad = (rotationDeg * Math.PI) / 180;
  return { cos: Math.cos(rad), sin: Math.sin(rad) };
}

function getRotatedCenterStage(
  topLeft: { x: number; y: number },
  size: { width: number; height: number },
  trig: RotationTrig,
): { x: number; y: number } {
  const hw = size.width / 2;
  const hh = size.height / 2;
  return {
    x: topLeft.x + hw * trig.cos - hh * trig.sin,
    y: topLeft.y + hw * trig.sin + hh * trig.cos,
  };
}

function centerOriginToTopLeft(
  centerOrigin: { x: number; y: number },
  size: { width: number; height: number },
  trig: RotationTrig,
  session: SnapSession,
): { x: number; y: number } {
  const hw = size.width / 2;
  const hh = size.height / 2;
  const centerStageX = session.frameCx + centerOrigin.x;
  const centerStageY = session.frameCy + centerOrigin.y;
  return {
    x: centerStageX - (hw * trig.cos - hh * trig.sin),
    y: centerStageY - (hw * trig.sin + hh * trig.cos),
  };
}

function clampScaleNonZero(scale: number): number {
  if (Math.abs(scale) < MIN_SCALE) {
    return scale < 0 ? -MIN_SCALE : MIN_SCALE;
  }
  return scale;
}

/** Minimum uniform scale so rendered size stays at least `minPx` on each axis. */
function minUniformScale(baseWidth: number, baseHeight: number, minPx = 48): number {
  if (baseWidth <= 0 || baseHeight <= 0) return MIN_SCALE;
  return Math.max(minPx / baseWidth, minPx / baseHeight);
}

function clampSnappedScale(
  scale: number,
  baseWidth: number,
  baseHeight: number,
  sign: number,
): number {
  const minScale = minUniformScale(baseWidth, baseHeight);
  const abs = Math.max(Math.abs(clampScaleNonZero(scale)), minScale);
  return sign * abs;
}

export interface SnapPreviewDragInput {
  pos: { x: number; y: number };
  size: { width: number; height: number };
  rotationDeg: number;
  session: SnapSession;
  peers: readonly SnapPeer[];
  excludeId: string;
  frameSnap: boolean;
  attachSnap: boolean;
}

/** Rotation-aware frame snap + optional peer attach (single path, no duplicate guide alloc). */
export function snapPreviewDrag({
  pos,
  size,
  rotationDeg,
  session,
  peers,
  excludeId,
  frameSnap,
  attachSnap,
}: SnapPreviewDragInput): { x: number; y: number; guides: CanvasGuideLine[] } {
  if (!frameSnap && !attachSnap) {
    return { ...pos, guides: [] };
  }

  const trig = rotationTrig(rotationDeg);
  let next = pos;
  const guides: CanvasGuideLine[] = frameSnap ? [...session.frameGuides] : [];

  if (frameSnap) {
    const center = getRotatedCenterStage(pos, size, trig);
    const centerOrigin = {
      x: center.x - session.frameCx,
      y: center.y - session.frameCy,
    };
    const { snappedPosition, activeLines } = snapPosition({
      proposedPosition: centerOrigin,
      canvasSize: session.canvasSize,
      elementSize: size,
      rotation: rotationDeg,
      snapThreshold: session.threshold,
    });
    next = centerOriginToTopLeft(snappedPosition, size, trig, session);
    if (activeLines.length > 0) {
      guides.push(...snapLinesToCanvasGuides(activeLines, session));
    }
  }

  if (attachSnap && peers.length > 0) {
    const peerTargets = buildPeerTargets(peers, excludeId);
    if (peerTargets.vertical.length > 0 || peerTargets.horizontal.length > 0) {
      const peerSnap = snapPeerPosition(
        next,
        size,
        peerTargets,
        session.threshold.x,
      );
      next = { x: peerSnap.x, y: peerSnap.y };
      guides.push(...peerSnap.guides);
    }
  }

  return { x: next.x, y: next.y, guides };
}

export interface KonvaResizeSnapInput {
  node: Konva.Group;
  baseWidth: number;
  baseHeight: number;
  session: SnapSession;
  uniform: boolean;
  skipSnap?: boolean;
  frameSnap?: boolean;
}

/** Live resize snap — adjusts scale only (Konva keeps anchor position). Returns snap guides. */
export function applyKonvaResizeSnap({
  node,
  baseWidth,
  baseHeight,
  session,
  uniform,
  skipSnap = false,
  frameSnap = true,
}: KonvaResizeSnapInput): CanvasGuideLine[] {
  if (!frameSnap || skipSnap) return [];

  const rotation = node.rotation();
  const scaleX = node.scaleX();
  const scaleY = node.scaleY();
  const absScaleX = Math.abs(scaleX);
  const absScaleY = Math.abs(scaleY);
  const signX = Math.sign(scaleX || 1);
  const signY = Math.sign(scaleY || 1);

  const trig = rotationTrig(rotation);
  const center = getRotatedCenterStage(
    { x: node.x(), y: node.y() },
    { width: baseWidth * absScaleX, height: baseHeight * absScaleY },
    trig,
  );
  const centerOrigin = {
    x: center.x - session.frameCx,
    y: center.y - session.frameCy,
  };

  if (uniform) {
    const proposedScale = (absScaleX + absScaleY) / 2;
    const { snappedScale, activeLines } = snapScale({
      proposedScale,
      position: centerOrigin,
      baseWidth,
      baseHeight,
      rotation,
      canvasSize: session.canvasSize,
      snapThreshold: session.threshold,
    });
    if (activeLines.length > 0 && Math.abs(snappedScale - proposedScale) > 0.001) {
      const clamped = clampSnappedScale(snappedScale, baseWidth, baseHeight, signX);
      node.scaleX(clamped);
      node.scaleY(Math.sign(scaleY || 1) * Math.abs(clamped));
    }
    return activeLines.length > 0 ? snapLinesToCanvasGuides(activeLines, session) : [];
  }

  const scaleDeltaX = Math.abs(absScaleX - 1);
  const scaleDeltaY = Math.abs(absScaleY - 1);
  const preferredEdges: ScaleEdgePreference | undefined =
    scaleDeltaX > scaleDeltaY * 1.5
      ? { left: true, right: true }
      : scaleDeltaY > scaleDeltaX * 1.5
        ? { top: true, bottom: true }
        : undefined;

  const { x: xSnap, y: ySnap } = snapScaleAxes({
    proposedScaleX: absScaleX,
    proposedScaleY: absScaleY,
    position: centerOrigin,
    baseWidth,
    baseHeight,
    rotation,
    canvasSize: session.canvasSize,
    snapThreshold: session.threshold,
    preferredEdges,
  });

  const hasSnap = xSnap.activeLines.length > 0 || ySnap.activeLines.length > 0;
  if (!hasSnap) return [];

  const nextScaleX = clampSnappedScale(xSnap.snappedScale, baseWidth, baseHeight, signX);
  const nextScaleY = clampSnappedScale(ySnap.snappedScale, baseWidth, baseHeight, signY);
  const minScale = minUniformScale(baseWidth, baseHeight);

  if (
    (xSnap.activeLines.length > 0 &&
      Math.abs(Math.abs(nextScaleX) - absScaleX) > 0.001) ||
    (ySnap.activeLines.length > 0 &&
      Math.abs(Math.abs(nextScaleY) - absScaleY) > 0.001)
  ) {
    node.scaleX(xSnap.activeLines.length > 0 ? nextScaleX : signX * Math.max(absScaleX, minScale));
    node.scaleY(ySnap.activeLines.length > 0 ? nextScaleY : signY * Math.max(absScaleY, minScale));
  }

  return snapLinesToCanvasGuides([...xSnap.activeLines, ...ySnap.activeLines], session);
}

/** Merge active snap lines with static frame guides (reuse cached frame array). */
export function mergeFrameAndSnapGuides(
  session: SnapSession,
  snapGuides: readonly CanvasGuideLine[],
): CanvasGuideLine[] {
  if (snapGuides.length === 0) return [...session.frameGuides];
  return [...session.frameGuides, ...snapGuides];
}
