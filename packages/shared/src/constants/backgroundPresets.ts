export const BACKGROUND_BLUR_LEVELS = [
  { level: 0, label: 'None', px: 0 },
  { level: 1, label: 'Light', px: 12 },
  { level: 2, label: 'Medium', px: 24 },
  { level: 3, label: 'Strong', px: 40 },
] as const;

export const BACKGROUND_COLOR_PRESETS = [
  '#000000',
  '#ffffff',
  '#1a1a2e',
  '#0f3460',
  '#533483',
  '#e94560',
  '#2d6a4f',
  '#ffb703',
] as const;

export interface BackgroundImagePreset {
  id: string;
  label: string;
  /** CSS linear-gradient for preview + canvas export. */
  gradient: string;
}

export const BACKGROUND_IMAGE_PRESETS: BackgroundImagePreset[] = [
  {
    id: 'gradient-purple',
    label: 'Purple',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    id: 'gradient-ocean',
    label: 'Ocean',
    gradient: 'linear-gradient(135deg, #2af598 0%, #009efd 100%)',
  },
  {
    id: 'gradient-sunset',
    label: 'Sunset',
    gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)',
  },
  {
    id: 'gradient-dark',
    label: 'Dark',
    gradient: 'linear-gradient(180deg, #141e30 0%, #243b55 100%)',
  },
  {
    id: 'gradient-gold',
    label: 'Gold',
    gradient: 'linear-gradient(135deg, #c9a227 0%, #1a1a1a 100%)',
  },
  {
    id: 'gradient-teal',
    label: 'Teal',
    gradient: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
  },
];

export function blurLevelToPx(level: number | undefined): number {
  const entry = BACKGROUND_BLUR_LEVELS.find((item) => item.level === level);
  return entry?.px ?? 0;
}

export function findBackgroundImagePreset(id: string | undefined) {
  if (!id) return null;
  return BACKGROUND_IMAGE_PRESETS.find((preset) => preset.id === id) ?? null;
}
