/**
 * CapCut-style transition presets.
 * Each preset defines CSS class (client-side preview) + FFmpeg xfade filter (server-side render).
 */

export interface TransitionPreset {
  id: string;
  label: string;
  /** CSS class for client-side preview animation */
  cssClass: string;
  /** FFmpeg xfade transition name (null = cut) */
  ffmpegXfade: string | null;
  /** Default duration in milliseconds */
  defaultDurationMs: number;
}

export const TRANSITION_PRESETS: TransitionPreset[] = [
  { id: 'none',        label: 'None',          cssClass: '',                  ffmpegXfade: null,        defaultDurationMs: 0 },
  { id: 'fade',        label: 'Fade',          cssClass: 'tr-fade',           ffmpegXfade: 'fade',      defaultDurationMs: 500 },
  { id: 'fadeblack',   label: 'Fade Black',    cssClass: 'tr-fadeblack',      ffmpegXfade: 'fadeblack', defaultDurationMs: 500 },
  { id: 'fadewhite',   label: 'Fade White',    cssClass: 'tr-fadewhite',      ffmpegXfade: 'fadewhite', defaultDurationMs: 500 },
  { id: 'dissolve',    label: 'Dissolve',      cssClass: 'tr-dissolve',       ffmpegXfade: 'dissolve',  defaultDurationMs: 400 },
  { id: 'wipeleft',    label: 'Wipe Left',     cssClass: 'tr-wipeleft',       ffmpegXfade: 'wipeleft',  defaultDurationMs: 500 },
  { id: 'wiperight',   label: 'Wipe Right',    cssClass: 'tr-wiperight',      ffmpegXfade: 'wiperight', defaultDurationMs: 500 },
  { id: 'wipeup',      label: 'Wipe Up',       cssClass: 'tr-wipeup',         ffmpegXfade: 'wipeup',    defaultDurationMs: 500 },
  { id: 'wipedown',    label: 'Wipe Down',     cssClass: 'tr-wipedown',       ffmpegXfade: 'wipedown',  defaultDurationMs: 500 },
  { id: 'slideleft',   label: 'Slide Left',    cssClass: 'tr-slideleft',      ffmpegXfade: 'slideleft', defaultDurationMs: 500 },
  { id: 'slideright',  label: 'Slide Right',   cssClass: 'tr-slideright',     ffmpegXfade: 'slideright',defaultDurationMs: 500 },
  { id: 'slideup',     label: 'Slide Up',      cssClass: 'tr-slideup',        ffmpegXfade: 'slideup',   defaultDurationMs: 500 },
  { id: 'slidedown',   label: 'Slide Down',    cssClass: 'tr-slidedown',      ffmpegXfade: 'slidedown', defaultDurationMs: 500 },
  { id: 'circlecrop',  label: 'Circle Crop',   cssClass: 'tr-circlecrop',     ffmpegXfade: 'circlecrop',defaultDurationMs: 600 },
  { id: 'rectcrop',    label: 'Rect Crop',     cssClass: 'tr-rectcrop',       ffmpegXfade: 'rectcrop',  defaultDurationMs: 600 },
  { id: 'distance',    label: 'Distance',      cssClass: 'tr-distance',       ffmpegXfade: 'distance',  defaultDurationMs: 500 },
  { id: 'squeezev',    label: 'Squeeze V',     cssClass: 'tr-squeezev',       ffmpegXfade: 'squeezev',  defaultDurationMs: 500 },
  { id: 'squeezeh',    label: 'Squeeze H',     cssClass: 'tr-squeezeh',       ffmpegXfade: 'squeezeh',  defaultDurationMs: 500 },
  { id: 'zoom',        label: 'Zoom',          cssClass: 'tr-zoom',           ffmpegXfade: 'zoomin',    defaultDurationMs: 600 },
  { id: 'pixelize',    label: 'Pixelize',      cssClass: 'tr-pixelize',       ffmpegXfade: 'pixelize',  defaultDurationMs: 500 },
  { id: 'diagtl',      label: 'Diagonal TL',   cssClass: 'tr-diagtl',         ffmpegXfade: 'diagtl',    defaultDurationMs: 500 },
  { id: 'diagtr',      label: 'Diagonal TR',   cssClass: 'tr-diagtr',         ffmpegXfade: 'diagtr',    defaultDurationMs: 500 },
  { id: 'diagbl',      label: 'Diagonal BL',   cssClass: 'tr-diagbl',         ffmpegXfade: 'diagbl',    defaultDurationMs: 500 },
  { id: 'diagbr',      label: 'Diagonal BR',   cssClass: 'tr-diagbr',         ffmpegXfade: 'diagbr',    defaultDurationMs: 500 },
];

export function findTransitionPreset(id: string): TransitionPreset | undefined {
  return TRANSITION_PRESETS.find((p) => p.id === id);
}
