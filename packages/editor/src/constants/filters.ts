/**
 * Filter preset definitions for the studio filters panel.
 * CSS filters drive real-time preview; FFmpeg filters drive server-side export.
 * Aligns with @vokop/shared FILTER_PRESETS — use these as the canonical source
 * when rendering per-clip filter options in the editor package.
 */

import type { FilterPreset } from '../types/filter.js';

export const FILTER_PRESETS: FilterPreset[] = [
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
    ffmpegFilter:
      'eq=contrast=1.12:saturation=1.1:brightness=-0.03,colorbalance=rs=0.05:gs=0.02:bs=-0.04',
  },
  {
    id: 'vintage',
    label: 'Vintage',
    cssFilter: 'sepia(0.45) contrast(1.05) saturate(0.9)',
    ffmpegFilter:
      'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131',
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

export function findFilterPreset(id: string): FilterPreset | undefined {
  return FILTER_PRESETS.find((f) => f.id === id);
}

/** Resolve CSS filter string for a given preset ID. Returns 'none' for unknown ids. */
export function getFilterCss(filterId: string | null | undefined): string {
  if (!filterId || filterId === 'original') return 'none';
  return FILTER_PRESETS.find((f) => f.id === filterId)?.cssFilter ?? 'none';
}

/** Resolve FFmpeg filter string for a given preset ID. Returns '' for unknown ids. */
export function getFilterFfmpeg(filterId: string | null | undefined): string {
  if (!filterId || filterId === 'original') return '';
  return FILTER_PRESETS.find((f) => f.id === filterId)?.ffmpegFilter ?? '';
}
