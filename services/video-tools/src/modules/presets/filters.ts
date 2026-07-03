/**
 * Color / LUT filter presets.
 * Each preset defines CSS filter string (client preview) + FFmpeg filter chain (render).
 */

export interface FilterPreset {
  id: string;
  label: string;
  category: 'color' | 'cinematic' | 'vintage' | 'bw' | 'vivid';
  /** CSS filter value for browser preview */
  cssFilter: string;
  /** FFmpeg vf filter string for server-side render */
  ffmpegFilter: string;
}

export const FILTER_PRESETS: FilterPreset[] = [
  { id: 'none',        label: 'None',          category: 'color',     cssFilter: 'none',                                                           ffmpegFilter: '' },

  // ─── Color ───────────────────────────────────────────────────────────────
  { id: 'bright',      label: 'Bright',        category: 'color',     cssFilter: 'brightness(1.2)',                                                ffmpegFilter: 'eq=brightness=0.1' },
  { id: 'contrast',    label: 'Contrast',      category: 'color',     cssFilter: 'contrast(1.3)',                                                  ffmpegFilter: 'eq=contrast=1.3' },
  { id: 'vivid',       label: 'Vivid',         category: 'vivid',     cssFilter: 'saturate(1.5) contrast(1.1)',                                    ffmpegFilter: 'eq=saturation=1.5:contrast=1.1' },
  { id: 'muted',       label: 'Muted',         category: 'color',     cssFilter: 'saturate(0.6)',                                                  ffmpegFilter: 'eq=saturation=0.6' },
  { id: 'warm',        label: 'Warm',          category: 'color',     cssFilter: 'sepia(0.2) saturate(1.2) hue-rotate(-10deg)',                    ffmpegFilter: 'colorbalance=rs=0.1:gs=0.05:bs=-0.1' },
  { id: 'cool',        label: 'Cool',          category: 'color',     cssFilter: 'hue-rotate(20deg) saturate(0.9)',                               ffmpegFilter: 'colorbalance=rs=-0.1:gs=0:bs=0.15' },

  // ─── Cinematic ────────────────────────────────────────────────────────────
  { id: 'cinema',      label: 'Cinema',        category: 'cinematic', cssFilter: 'contrast(1.2) saturate(0.85)',                                   ffmpegFilter: 'eq=contrast=1.2:saturation=0.85,curves=r=\'0/0 64/50 128/105 192/170 255/210\'' },
  { id: 'teal-orange', label: 'Teal & Orange', category: 'cinematic', cssFilter: 'contrast(1.15) saturate(1.1) hue-rotate(-5deg)',                 ffmpegFilter: 'colorbalance=rs=0.15:bs=-0.1,hue=h=5:s=1.1' },
  { id: 'bleach',      label: 'Bleach',        category: 'cinematic', cssFilter: 'contrast(1.3) brightness(1.05) saturate(0.7)',                   ffmpegFilter: 'eq=contrast=1.3:brightness=0.05:saturation=0.7' },

  // ─── Vintage ─────────────────────────────────────────────────────────────
  { id: 'sepia',       label: 'Sepia',         category: 'vintage',   cssFilter: 'sepia(0.8)',                                                     ffmpegFilter: 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131' },
  { id: 'faded',       label: 'Faded',         category: 'vintage',   cssFilter: 'contrast(0.85) saturate(0.7) brightness(1.1)',                   ffmpegFilter: 'eq=contrast=0.85:saturation=0.7:brightness=0.05,fade=in:0:0' },
  { id: 'retro',       label: 'Retro',         category: 'vintage',   cssFilter: 'sepia(0.4) saturate(1.2) hue-rotate(-20deg)',                    ffmpegFilter: 'colorbalance=rs=0.1:gs=0:bs=-0.15,eq=saturation=1.2' },
  { id: 'lomography',  label: 'Lomography',    category: 'vintage',   cssFilter: 'contrast(1.4) saturate(1.3) brightness(0.9)',                    ffmpegFilter: 'eq=contrast=1.4:saturation=1.3:brightness=-0.05,vignette' },

  // ─── Black & White ────────────────────────────────────────────────────────
  { id: 'bw',          label: 'B&W',           category: 'bw',        cssFilter: 'grayscale(1)',                                                   ffmpegFilter: 'hue=s=0' },
  { id: 'bw-high',     label: 'B&W High',      category: 'bw',        cssFilter: 'grayscale(1) contrast(1.4)',                                     ffmpegFilter: 'hue=s=0,eq=contrast=1.4' },
  { id: 'bw-soft',     label: 'B&W Soft',      category: 'bw',        cssFilter: 'grayscale(1) brightness(1.1) contrast(0.9)',                     ffmpegFilter: 'hue=s=0,eq=brightness=0.05:contrast=0.9' },
  { id: 'noir',        label: 'Noir',          category: 'bw',        cssFilter: 'grayscale(1) contrast(1.5) brightness(0.85)',                    ffmpegFilter: 'hue=s=0,eq=contrast=1.5:brightness=-0.08,vignette' },
];

export function findFilterPreset(id: string): FilterPreset | undefined {
  return FILTER_PRESETS.find((p) => p.id === id);
}
