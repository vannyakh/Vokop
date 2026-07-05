import type { CanvasElement, CanvasKeyframe, CanvasKeyframeEasing } from '@/types/canvas';
import { applyClipAnimations } from '@/features/studio/lib/canvasAnimations';

function ease(t: number, easing: CanvasKeyframeEasing = 'ease-in-out'): number {
  const x = Math.min(1, Math.max(0, t));
  switch (easing) {
    case 'linear':
      return x;
    case 'ease-in':
      return x * x;
    case 'ease-out':
      return 1 - (1 - x) * (1 - x);
    case 'ease-in-out':
    default:
      return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export type AnimatedCanvasProps = Pick<
  CanvasElement,
  'x' | 'y' | 'opacity' | 'rotation' | 'width' | 'height'
>;

/** Interpolate element transform/opacity at an absolute timeline time. */
export function sampleElementAtTime(
  element: CanvasElement,
  time: number,
): AnimatedCanvasProps {
  const base: AnimatedCanvasProps = {
    x: element.x,
    y: element.y,
    opacity: element.opacity,
    rotation: element.rotation,
    width: element.width,
    height: element.height,
  };

  const frames = [...(element.keyframes ?? [])].sort((a, b) => a.offset - b.offset);
  const offset = time - element.startTime;
  const duration = Math.max(0.001, element.endTime - element.startTime);
  const t = Math.min(duration, Math.max(0, offset));

  if (frames.length === 0) {
    return applyClipAnimations(element, t, duration, base);
  }

  const withBase: CanvasKeyframe[] = [
    {
      id: '__start',
      offset: 0,
      x: element.x,
      y: element.y,
      opacity: element.opacity,
      rotation: element.rotation,
      scale: 1,
      easing: 'linear',
    },
    ...frames,
  ];

  if (t <= withBase[0].offset) {
    return applyClipAnimations(element, t, duration, applyKeyframe(base, withBase[0]));
  }

  const last = withBase[withBase.length - 1];
  if (t >= last.offset) {
    return applyClipAnimations(element, t, duration, applyKeyframe(base, last));
  }

  let i = 0;
  while (i < withBase.length - 1 && withBase[i + 1].offset < t) i += 1;
  const a = withBase[i];
  const b = withBase[i + 1];
  const span = Math.max(0.0001, b.offset - a.offset);
  const u = ease((t - a.offset) / span, b.easing ?? a.easing ?? 'ease-in-out');

  const scaleA = a.scale ?? 1;
  const scaleB = b.scale ?? scaleA;
  const scale = lerp(scaleA, scaleB, u);

  return applyClipAnimations(element, t, duration, {
    x: lerp(a.x ?? base.x, b.x ?? a.x ?? base.x, u),
    y: lerp(a.y ?? base.y, b.y ?? a.y ?? base.y, u),
    opacity: lerp(a.opacity ?? base.opacity, b.opacity ?? a.opacity ?? base.opacity, u),
    rotation: lerp(a.rotation ?? base.rotation, b.rotation ?? a.rotation ?? base.rotation, u),
    width: base.width * scale,
    height: base.height * scale,
  });
}

function applyKeyframe(base: AnimatedCanvasProps, kf: CanvasKeyframe): AnimatedCanvasProps {
  const scale = kf.scale ?? 1;
  return {
    x: kf.x ?? base.x,
    y: kf.y ?? base.y,
    opacity: kf.opacity ?? base.opacity,
    rotation: kf.rotation ?? base.rotation,
    width: base.width * scale,
    height: base.height * scale,
  };
}

export function createKeyframeAtOffset(
  element: CanvasElement,
  offset: number,
): CanvasKeyframe {
  const clamped = Math.max(0, Math.min(element.endTime - element.startTime, offset));
  return {
    id: `kf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    offset: clamped,
    x: element.x,
    y: element.y,
    opacity: element.opacity,
    rotation: element.rotation,
    scale: 1,
    easing: 'ease-in-out',
  };
}
