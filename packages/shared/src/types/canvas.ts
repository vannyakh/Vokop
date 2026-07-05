export type CanvasTool = 'select' | 'pan';

export type CanvasElementType = 'text' | 'overlay' | 'logo' | 'image';

export type CanvasTextEffectId =
  | 'none'
  | 'glow-teal'
  | 'glow-orange'
  | 'neon-pink'
  | 'outline-white'
  | 'outline-black'
  | 'shadow-soft'
  | 'shadow-hard'
  | 'fire'
  | 'ice'
  | 'retro';

export interface CanvasTextStyle {
  fill?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase';
  stroke?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  background?: string;
  align?: 'left' | 'center' | 'right';
}

/** Ease curve for timeline keyframes (After Effects–style). */
export type CanvasKeyframeEasing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

/** Keyframe relative to clip start (`offset` in seconds). */
export interface CanvasKeyframe {
  id: string;
  offset: number;
  /** Absolute position, same units as `CanvasElement.x` (fraction of content rect). */
  x?: number;
  /** Absolute position, same units as `CanvasElement.y` (fraction of content rect). */
  y?: number;
  opacity?: number;
  rotation?: number;
  scale?: number;
  easing?: CanvasKeyframeEasing;
}

export interface CanvasElement {
  id: string;
  type: CanvasElementType;
  text: string;
  /** Fraction (0..1) of the video content rect width; can exceed 1 for oversized elements. */
  x: number;
  /** Fraction (0..1) of the video content rect height. */
  y: number;
  /** Fraction (0..1) of the video content rect width. */
  width: number;
  /** Fraction (0..1) of the video content rect height. */
  height: number;
  /** Fraction (0..1) of the video content rect height. */
  fontSize: number;
  rotation: number;
  opacity: number;
  src?: string;
  segmentIndex?: number;
  segmentType?: 'translation' | 'transcript';
  templateId?: string;
  textStyle?: CanvasTextStyle;
  fontFamily?: string;
  textEffect?: CanvasTextEffectId;
  startTime: number;
  endTime: number;
  trackId?: string;
  /** Animation keyframes along the clip (EA-style). */
  keyframes?: CanvasKeyframe[];
}

export type { CanvasTool as CanvasToolMode };
