import type { NormalizedCropRect } from './crop.js';

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
  /** Two-stop linear gradient; takes priority over `fill` when set. */
  fillGradient?: { colors: [string, string]; direction: 'vertical' | 'horizontal' };
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  underline?: boolean;
  letterSpacing?: number;
  /** Line height as a multiplier of font size (e.g. 1.35 = 135%). */
  lineHeight?: number;
  textTransform?: 'none' | 'uppercase';
  /** How overflow text wraps within the box (Konva `wrap`). */
  wrap?: 'word' | 'char' | 'none';
  stroke?: string;
  strokeWidth?: number;
  strokeLineJoin?: 'miter' | 'round' | 'bevel';
  shadowColor?: string;
  shadowBlur?: number;
  shadowOpacity?: number;
  /** Shadow direction in degrees (0 = right, 90 = down). */
  shadowAngle?: number;
  /** Shadow offset distance in px. */
  shadowDistance?: number;
  background?: string;
  /** Corner radius (px, at the reference frame size) of the background box. */
  backgroundRadius?: number;
  align?: 'left' | 'center' | 'right';
}

/** Ease curve for timeline keyframes (After Effects–style). */
export type CanvasKeyframeEasing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

/** Omniclip-style clip entrance/exit preset ids. */
export type CanvasAnimationPresetId =
  | 'none'
  | 'fade-in'
  | 'fade-out'
  | 'slide-in-left'
  | 'slide-in-right'
  | 'slide-in-up'
  | 'slide-in-down'
  | 'slide-out-left'
  | 'slide-out-right'
  | 'slide-out-up'
  | 'slide-out-down'
  | 'zoom-in'
  | 'zoom-out'
  | 'spin-in'
  | 'spin-out';

export type CanvasAnimationInPresetId =
  | 'fade-in'
  | 'slide-in-left'
  | 'slide-in-right'
  | 'slide-in-up'
  | 'slide-in-down'
  | 'zoom-in'
  | 'spin-in';

export type CanvasAnimationOutPresetId =
  | 'fade-out'
  | 'slide-out-left'
  | 'slide-out-right'
  | 'slide-out-up'
  | 'slide-out-down'
  | 'zoom-out'
  | 'spin-out';

/** Applied at clip start (in) or end (out). Duration in seconds. */
export interface CanvasClipAnimationIn {
  preset: CanvasAnimationInPresetId;
  durationSec: number;
}

export interface CanvasClipAnimationOut {
  preset: CanvasAnimationOutPresetId;
  durationSec: number;
}

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
  /** Entrance animation preset (Omniclip-style, sampled at playback). */
  animationIn?: CanvasClipAnimationIn;
  /** Exit animation preset (Omniclip-style, sampled at playback). */
  animationOut?: CanvasClipAnimationOut;
  /** Mirror horizontally in the composition preview. */
  flipX?: boolean;
  /** Mirror vertically in the composition preview. */
  flipY?: boolean;
  /** Non-destructive crop (normalized 0..1 within media bounds). */
  crop?: NormalizedCropRect;
}

export type { CanvasTool as CanvasToolMode };
