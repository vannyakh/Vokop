import type {
  CanvasAnimationInPresetId,
  CanvasAnimationOutPresetId,
  CanvasAnimationPresetId,
  CanvasElement,
} from '@/types/canvas';
import type { AnimatedCanvasProps } from '@/features/studio/lib/keyframeUtils';

export const CANVAS_ANIMATION_IN_PRESETS = [
  'fade-in',
  'slide-in-left',
  'slide-in-right',
  'slide-in-up',
  'slide-in-down',
  'zoom-in',
  'spin-in',
] as const satisfies readonly CanvasAnimationInPresetId[];

export const CANVAS_ANIMATION_OUT_PRESETS = [
  'fade-out',
  'slide-out-left',
  'slide-out-right',
  'slide-out-up',
  'slide-out-down',
  'zoom-out',
  'spin-out',
] as const satisfies readonly CanvasAnimationOutPresetId[];

export const CANVAS_ANIMATION_LABELS: Record<
  Exclude<CanvasAnimationPresetId, 'none'>,
  string
> = {
  'fade-in': 'Fade',
  'fade-out': 'Fade',
  'slide-in-left': 'Slide ←',
  'slide-in-right': 'Slide →',
  'slide-in-up': 'Slide ↑',
  'slide-in-down': 'Slide ↓',
  'slide-out-left': 'Slide ←',
  'slide-out-right': 'Slide →',
  'slide-out-up': 'Slide ↑',
  'slide-out-down': 'Slide ↓',
  'zoom-in': 'Zoom',
  'zoom-out': 'Zoom',
  'spin-in': 'Spin',
  'spin-out': 'Spin',
};

export const DEFAULT_ANIMATION_DURATION_SEC = 0.5;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t: number): number {
  return t * t * t;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

const SLIDE_OFFSET = 0.14;
const ZOOM_FROM = 0.55;
const SPIN_DEG = 90;

function applyInPreset(
  preset: CanvasAnimationInPresetId,
  u: number,
  rest: AnimatedCanvasProps,
): AnimatedCanvasProps {
  const t = easeOutCubic(u);
  switch (preset) {
    case 'fade-in':
      return { ...rest, opacity: rest.opacity * t };
    case 'slide-in-left':
      return { ...rest, x: rest.x - SLIDE_OFFSET * (1 - t) };
    case 'slide-in-right':
      return { ...rest, x: rest.x + SLIDE_OFFSET * (1 - t) };
    case 'slide-in-up':
      return { ...rest, y: rest.y - SLIDE_OFFSET * (1 - t) };
    case 'slide-in-down':
      return { ...rest, y: rest.y + SLIDE_OFFSET * (1 - t) };
    case 'zoom-in': {
      const scale = lerp(ZOOM_FROM, 1, t);
      return { ...rest, width: rest.width * scale, height: rest.height * scale };
    }
    case 'spin-in':
      return { ...rest, rotation: rest.rotation - SPIN_DEG * (1 - t) };
    default:
      return rest;
  }
}

function applyOutPreset(
  preset: CanvasAnimationOutPresetId,
  u: number,
  rest: AnimatedCanvasProps,
): AnimatedCanvasProps {
  const t = easeInCubic(u);
  switch (preset) {
    case 'fade-out':
      return { ...rest, opacity: rest.opacity * (1 - t) };
    case 'slide-out-left':
      return { ...rest, x: rest.x - SLIDE_OFFSET * t };
    case 'slide-out-right':
      return { ...rest, x: rest.x + SLIDE_OFFSET * t };
    case 'slide-out-up':
      return { ...rest, y: rest.y - SLIDE_OFFSET * t };
    case 'slide-out-down':
      return { ...rest, y: rest.y + SLIDE_OFFSET * t };
    case 'zoom-out': {
      const scale = lerp(1, ZOOM_FROM, t);
      return { ...rest, width: rest.width * scale, height: rest.height * scale };
    }
    case 'spin-out':
      return { ...rest, rotation: rest.rotation + SPIN_DEG * t };
    default:
      return rest;
  }
}

/** Apply Omniclip-style in/out presets on top of keyframe-interpolated props. */
export function applyClipAnimations(
  element: CanvasElement,
  clipOffsetSec: number,
  clipDurationSec: number,
  props: AnimatedCanvasProps,
): AnimatedCanvasProps {
  let result = props;
  const duration = Math.max(0.001, clipDurationSec);

  if (element.animationIn) {
    const anim = element.animationIn;
    const d = Math.min(Math.max(0.05, anim.durationSec), duration * 0.85);
    if (clipOffsetSec < d) {
      result = applyInPreset(anim.preset, clipOffsetSec / d, result);
    }
  }

  if (element.animationOut) {
    const anim = element.animationOut;
    const d = Math.min(Math.max(0.05, anim.durationSec), duration * 0.85);
    const outStart = duration - d;
    if (clipOffsetSec > outStart) {
      result = applyOutPreset(anim.preset, (clipOffsetSec - outStart) / d, result);
    }
  }

  return result;
}
