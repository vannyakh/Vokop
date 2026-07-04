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
  x?: number;
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
  x: number;
  y: number;
  width: number;
  height: number;
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
