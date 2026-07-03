/**
 * Animation types — adapted from Omniclip's animation-manager.
 * Supports in/out entrance and exit animations for image/video clips.
 */

export type AnimationType = 'in' | 'out';

/** Which part of the pipeline the animation applies to */
export type AnimationFor = 'Animation' | 'Transition';

export interface ClipAnimation {
  id: string;
  /** Target clip ID */
  targetClipId: string;
  /** Animation direction */
  type: AnimationType;
  /** Animation preset name (e.g. "fade-in", "slide-left") */
  name: string;
  /** Duration in milliseconds */
  duration: number;
  for: AnimationFor;
}

export interface TextDefaultStyles {
  size: number;
  style: string[];
  variant: string[];
  weight: string[];
  fill: string[];
  fillGradientStops: number[];
  lineJoin: string[];
  textBaseline: string[];
  align: string[];
  whiteSpace: string[];
}
