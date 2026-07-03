/**
 * Animation preset lists — adapted from Omniclip's animation-manager.
 * These drive the `OmniAnim`-style panel in the Vokop studio.
 */

/** Entry animations (clip appears) */
export const ANIMATION_IN: string[] = [
  'fade-in',
  'slide-left',
  'slide-right',
  'slide-up',
  'slide-down',
  'zoom-in',
  'zoom-out',
  'flip-horizontal',
  'flip-vertical',
  'bounce-in',
  'rotate-in',
  'wipe-left',
  'wipe-right',
  'blur-in',
];

/** Exit animations (clip disappears) */
export const ANIMATION_OUT: string[] = [
  'fade-out',
  'slide-left',
  'slide-right',
  'slide-up',
  'slide-down',
  'zoom-in',
  'zoom-out',
  'flip-horizontal',
  'flip-vertical',
  'bounce-out',
  'rotate-out',
  'wipe-left',
  'wipe-right',
  'blur-out',
];

export const ANIMATION_NONE = 'none';

/** Default animation duration in ms */
export const DEFAULT_ANIMATION_DURATION_MS = 520;

/** Parse a compound animation name (e.g. "fade-in") into { base, direction } */
export function parseAnimationName(name: string): { base: string; direction: string } {
  const parts = name.split('-');
  const direction = parts.at(-1) ?? '';
  const base = parts.slice(0, -1).join('-');
  return { base, direction };
}

/**
 * Map animation name to a CSS animation class / keyframe name.
 * Used for canvas/preview rendering of in/out animations.
 */
export const ANIMATION_CSS_CLASS: Record<string, string> = {
  'fade-in': 'vk-anim-fade-in',
  'fade-out': 'vk-anim-fade-out',
  'slide-left': 'vk-anim-slide-left',
  'slide-right': 'vk-anim-slide-right',
  'slide-up': 'vk-anim-slide-up',
  'slide-down': 'vk-anim-slide-down',
  'zoom-in': 'vk-anim-zoom-in',
  'zoom-out': 'vk-anim-zoom-out',
  'flip-horizontal': 'vk-anim-flip-h',
  'flip-vertical': 'vk-anim-flip-v',
  'bounce-in': 'vk-anim-bounce-in',
  'bounce-out': 'vk-anim-bounce-out',
  'rotate-in': 'vk-anim-rotate-in',
  'rotate-out': 'vk-anim-rotate-out',
  'wipe-left': 'vk-anim-wipe-left',
  'wipe-right': 'vk-anim-wipe-right',
  'blur-in': 'vk-anim-blur-in',
  'blur-out': 'vk-anim-blur-out',
};
