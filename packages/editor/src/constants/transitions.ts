/**
 * Transition preset definitions — merges Omniclip's transition list with
 * Vokop's existing TRANSITION_PRESETS from @vokop/shared.
 * These are the canonical transition definitions consumed by both the
 * timeline UI and the FFmpeg export pipeline.
 */

import type { TransitionPreset } from '../types/transition.js';

export const TRANSITION_PRESETS: TransitionPreset[] = [
  {
    name: 'cut',
    label: 'Cut',
    defaultDuration: 0,
  },
  {
    name: 'dissolve',
    label: 'Dissolve',
    ffmpegFilter: 'xfade=transition=fade',
    cssClass: 'vk-trans-dissolve',
    defaultDuration: 500,
  },
  {
    name: 'fade',
    label: 'Fade to black',
    ffmpegFilter: 'xfade=transition=fadeblack',
    cssClass: 'vk-trans-fade',
    defaultDuration: 400,
  },
  {
    name: 'wipe-left',
    label: 'Wipe left',
    ffmpegFilter: 'xfade=transition=wipeleft',
    cssClass: 'vk-trans-wipe-left',
    defaultDuration: 450,
  },
  {
    name: 'wipe-right',
    label: 'Wipe right',
    ffmpegFilter: 'xfade=transition=wiperight',
    cssClass: 'vk-trans-wipe-right',
    defaultDuration: 450,
  },
  {
    name: 'wipe-up',
    label: 'Wipe up',
    ffmpegFilter: 'xfade=transition=wipeup',
    cssClass: 'vk-trans-wipe-up',
    defaultDuration: 450,
  },
  {
    name: 'wipe-down',
    label: 'Wipe down',
    ffmpegFilter: 'xfade=transition=wipedown',
    cssClass: 'vk-trans-wipe-down',
    defaultDuration: 450,
  },
  {
    name: 'slide-up',
    label: 'Slide up',
    ffmpegFilter: 'xfade=transition=slideup',
    cssClass: 'vk-trans-slide-up',
    defaultDuration: 400,
  },
  {
    name: 'slide-down',
    label: 'Slide down',
    ffmpegFilter: 'xfade=transition=slidedown',
    cssClass: 'vk-trans-slide-down',
    defaultDuration: 400,
  },
  {
    name: 'slide-left',
    label: 'Slide left',
    ffmpegFilter: 'xfade=transition=slideleft',
    cssClass: 'vk-trans-slide-left',
    defaultDuration: 400,
  },
  {
    name: 'slide-right',
    label: 'Slide right',
    ffmpegFilter: 'xfade=transition=slideright',
    cssClass: 'vk-trans-slide-right',
    defaultDuration: 400,
  },
  {
    name: 'zoom-in',
    label: 'Zoom in',
    ffmpegFilter: 'xfade=transition=zoomin',
    cssClass: 'vk-trans-zoom-in',
    defaultDuration: 350,
  },
  {
    name: 'blur',
    label: 'Blur',
    ffmpegFilter: 'xfade=transition=hblur',
    cssClass: 'vk-trans-blur',
    defaultDuration: 400,
  },
  {
    name: 'flash',
    label: 'Flash',
    ffmpegFilter: 'xfade=transition=fadewhite',
    cssClass: 'vk-trans-flash',
    defaultDuration: 200,
  },
  {
    name: 'spin',
    label: 'Spin',
    ffmpegFilter: 'xfade=transition=circleopen',
    cssClass: 'vk-trans-spin',
    defaultDuration: 500,
  },
  {
    name: 'pixelize',
    label: 'Pixelize',
    ffmpegFilter: 'xfade=transition=pixelize',
    cssClass: 'vk-trans-pixelize',
    defaultDuration: 500,
  },
  {
    name: 'radial',
    label: 'Radial wipe',
    ffmpegFilter: 'xfade=transition=radial',
    cssClass: 'vk-trans-radial',
    defaultDuration: 600,
  },
];

export const TRANSITION_NONE = 'cut';

/** Default transition duration in ms */
export const DEFAULT_TRANSITION_DURATION_MS = 520;

export function findTransitionPreset(name: string): TransitionPreset | undefined {
  return TRANSITION_PRESETS.find((t) => t.name === name);
}
