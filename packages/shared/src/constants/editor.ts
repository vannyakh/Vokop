import type { CaptionStyle } from '../types/export.js';
import type { EditorPreset, EditorToolCatalog } from '../types/editor.js';

export const CAPTION_STYLE_PRESETS: { id: CaptionStyle; label: string; description: string }[] = [
  { id: 'standard', label: 'Standard', description: 'White text with soft shadow' },
  { id: 'highlight', label: 'Highlight', description: 'Accent bar behind active words' },
  { id: 'karaoke', label: 'Karaoke', description: 'Word-by-word fill animation style' },
  { id: 'none', label: 'Hidden', description: 'No captions on export' },
];

export const AUDIO_MIX_PRESETS: EditorPreset[] = [
  { id: 'balanced', label: 'Balanced', description: 'Original 20% · Voice 100%', meta: { original: 0.2, voice: 1 } },
  { id: 'voice-forward', label: 'Voice forward', description: 'Boost AI voiceover', meta: { original: 0.1, voice: 1.4 } },
  { id: 'original-forward', label: 'Original forward', description: 'Keep more source audio', meta: { original: 0.6, voice: 0.8 } },
  { id: 'voice-only', label: 'Voice only', description: 'Mute original track', meta: { original: 0, voice: 1.2 } },
  { id: 'original-only', label: 'Original only', description: 'Mute AI voiceover', meta: { original: 1, voice: 0 } },
];

export const TRANSITION_PRESETS: EditorPreset[] = [
  { id: 'cut', label: 'Cut', description: 'Instant change', meta: { duration: 0, ffmpegXfade: null } },
  { id: 'dissolve', label: 'Dissolve', description: 'Cross-fade blend', meta: { duration: 0.5, ffmpegXfade: 'fade' } },
  { id: 'fade', label: 'Fade', description: 'Fade through black', meta: { duration: 0.4, ffmpegXfade: 'fadeblack' } },
  { id: 'wipe-left', label: 'Wipe left', description: 'Reveal from right', meta: { duration: 0.45, ffmpegXfade: 'wipeleft' } },
  { id: 'wipe-right', label: 'Wipe right', description: 'Reveal from left', meta: { duration: 0.45, ffmpegXfade: 'wiperight' } },
  { id: 'slide-up', label: 'Slide up', description: 'Push clip upward', meta: { duration: 0.4, ffmpegXfade: 'slideup' } },
  { id: 'slide-down', label: 'Slide down', description: 'Push clip downward', meta: { duration: 0.4, ffmpegXfade: 'slidedown' } },
  { id: 'zoom-in', label: 'Zoom in', description: 'Scale into next clip', meta: { duration: 0.35, ffmpegXfade: 'zoomin' } },
  { id: 'zoom-out', label: 'Zoom out', description: 'Scale out transition', meta: { duration: 0.35, ffmpegXfade: 'fade' } },
  { id: 'blur', label: 'Blur', description: 'Blur between clips', meta: { duration: 0.4, ffmpegXfade: 'hblur' } },
  { id: 'flash', label: 'Flash', description: 'Quick white flash', meta: { duration: 0.2, ffmpegXfade: 'fadewhite' } },
  { id: 'spin', label: 'Spin', description: 'Rotate transition', meta: { duration: 0.5, ffmpegXfade: 'circleopen' } },
];

export const FILTER_PRESETS: EditorPreset[] = [
  { id: 'original', label: 'Original', cssFilter: 'none', ffmpegFilter: '' },
  {
    id: 'vivid',
    label: 'Vivid',
    cssFilter: 'saturate(1.35) contrast(1.08)',
    ffmpegFilter: 'eq=saturation=1.35:contrast=1.08',
  },
  {
    id: 'matte',
    label: 'Matte',
    cssFilter: 'saturate(0.85) contrast(0.95) brightness(1.05)',
    ffmpegFilter: 'eq=saturation=0.85:contrast=0.95:brightness=0.05',
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    cssFilter: 'contrast(1.12) saturate(1.1) brightness(0.97) sepia(0.08)',
    ffmpegFilter: 'eq=contrast=1.12:saturation=1.1:brightness=-0.03,colorbalance=rs=0.05:gs=0.02:bs=-0.04',
  },
  {
    id: 'vintage',
    label: 'Vintage',
    cssFilter: 'sepia(0.45) contrast(1.05) saturate(0.9)',
    ffmpegFilter: 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131',
  },
  {
    id: 'bw',
    label: 'B&W',
    cssFilter: 'grayscale(1) contrast(1.1)',
    ffmpegFilter: 'hue=s=0,eq=contrast=1.1',
  },
  {
    id: 'warm',
    label: 'Warm',
    cssFilter: 'sepia(0.25) saturate(1.2) hue-rotate(-8deg)',
    ffmpegFilter: 'colortemperature=6500,eq=saturation=1.15',
  },
  {
    id: 'cool',
    label: 'Cool',
    cssFilter: 'saturate(1.1) hue-rotate(12deg) brightness(1.02)',
    ffmpegFilter: 'colortemperature=9000,eq=saturation=1.1',
  },
  {
    id: 'drama',
    label: 'Drama',
    cssFilter: 'contrast(1.25) saturate(0.9) brightness(0.92)',
    ffmpegFilter: 'eq=contrast=1.25:saturation=0.9:brightness=-0.08',
  },
  {
    id: 'faded',
    label: 'Faded',
    cssFilter: 'contrast(0.9) saturate(0.8) brightness(1.08)',
    ffmpegFilter: 'eq=contrast=0.9:saturation=0.8:brightness=0.08',
  },
  {
    id: 'punch',
    label: 'Punch',
    cssFilter: 'saturate(1.5) contrast(1.15)',
    ffmpegFilter: 'eq=saturation=1.5:contrast=1.15',
  },
];

export const EFFECT_PRESETS: EditorPreset[] = [
  { id: 'none', label: 'None', description: 'No overlay effect' },
  { id: 'vignette', label: 'Vignette', description: 'Darkened edges', ffmpegFilter: 'vignette=angle=PI/4' },
  { id: 'grain', label: 'Film grain', description: 'Subtle noise texture', ffmpegFilter: 'noise=alls=8:allf=t' },
  { id: 'sharpen', label: 'Sharpen', description: 'Crisp detail boost', ffmpegFilter: 'unsharp=5:5:0.8:5:5:0' },
  { id: 'glow', label: 'Soft glow', description: 'Dreamy bloom', ffmpegFilter: 'boxblur=4:1' },
  { id: 'mirror', label: 'Mirror', description: 'Horizontal flip', ffmpegFilter: 'hflip' },
];

export const MEDIA_ACTION_PRESETS: EditorPreset[] = [
  { id: 'fit-frame', label: 'Fit frame', description: 'Scale to canvas bounds' },
  { id: 'fill-frame', label: 'Fill frame', description: 'Cover canvas area' },
  { id: 'auto-enhance', label: 'Auto enhance', description: 'Light balance pass', ffmpegFilter: 'eq=brightness=0.03:contrast=1.05:saturation=1.08' },
];

export function getEditorCatalog(): EditorToolCatalog[] {
  return [
    { id: 'media', label: 'Media', presets: MEDIA_ACTION_PRESETS },
    { id: 'text', label: 'Text', presets: [] },
    { id: 'audio', label: 'Audio', presets: AUDIO_MIX_PRESETS },
    { id: 'voice', label: 'Voice', presets: [] },
    {
      id: 'captions',
      label: 'Captions',
      presets: CAPTION_STYLE_PRESETS.map((p) => ({
        id: p.id,
        label: p.label,
        description: p.description,
      })),
    },
    { id: 'effects', label: 'Effects', presets: EFFECT_PRESETS },
    { id: 'transitions', label: 'Transitions', presets: TRANSITION_PRESETS },
    { id: 'filters', label: 'Filters', presets: FILTER_PRESETS },
  ];
}

export function findEditorPreset(tool: string, presetId: string): EditorPreset | undefined {
  const catalog = getEditorCatalog();
  return catalog.find((t) => t.id === tool)?.presets.find((p) => p.id === presetId);
}

export function getFilterCss(filterId: string | null | undefined): string {
  if (!filterId || filterId === 'original') return 'none';
  return FILTER_PRESETS.find((p) => p.id === filterId)?.cssFilter ?? 'none';
}

export function getFilterFfmpeg(filterId: string | null | undefined): string {
  if (!filterId || filterId === 'original') return '';
  return FILTER_PRESETS.find((p) => p.id === filterId)?.ffmpegFilter ?? '';
}

export function getTransitionXfade(presetId: string | null | undefined): string | null {
  if (!presetId || presetId === 'cut') return null;
  const meta = findEditorPreset('transitions', presetId)?.meta as
    | { ffmpegXfade?: string | null }
    | undefined;
  return meta?.ffmpegXfade ?? null;
}

export function getTransitionDefaultDurationSec(presetId: string): number {
  const meta = findEditorPreset('transitions', presetId)?.meta as { duration?: number } | undefined;
  return typeof meta?.duration === 'number' ? meta.duration : 0.5;
}
