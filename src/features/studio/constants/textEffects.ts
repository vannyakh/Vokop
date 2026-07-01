import type { CanvasTextEffectId } from '@/types/canvas';

export interface TextEffectConfig {
  label: string;
  previewColor: string;
  previewBg: string;
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
}

export const TEXT_EFFECTS: Record<CanvasTextEffectId, TextEffectConfig> = {
  none: {
    label: 'None',
    previewColor: '#ffffff',
    previewBg: '#1a1a1a',
  },
  'glow-teal': {
    label: 'Glow Teal',
    previewColor: '#54D6C9',
    previewBg: '#0a1a1a',
    fill: '#54D6C9',
    shadowEnabled: true,
    shadowColor: 'rgba(84,214,201,0.9)',
    shadowBlur: 18,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowOpacity: 1,
  },
  'glow-orange': {
    label: 'Glow Orange',
    previewColor: '#FB923C',
    previewBg: '#1a0e05',
    fill: '#FB923C',
    shadowEnabled: true,
    shadowColor: 'rgba(251,146,60,0.9)',
    shadowBlur: 18,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowOpacity: 1,
  },
  'neon-pink': {
    label: 'Neon Pink',
    previewColor: '#F472B6',
    previewBg: '#18040e',
    fill: '#F472B6',
    shadowEnabled: true,
    shadowColor: 'rgba(244,114,182,0.95)',
    shadowBlur: 22,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowOpacity: 1,
    stroke: '#F9A8D4',
    strokeWidth: 0.5,
  },
  'outline-white': {
    label: 'Outline',
    previewColor: '#ffffff',
    previewBg: '#333',
    fill: '#ffffff',
    stroke: '#ffffff',
    strokeWidth: 2,
    shadowEnabled: true,
    shadowColor: 'rgba(0,0,0,0.9)',
    shadowBlur: 4,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  },
  'outline-black': {
    label: 'Stroke',
    previewColor: '#ffffff',
    previewBg: '#1a1a1a',
    fill: '#ffffff',
    stroke: '#000000',
    strokeWidth: 3,
  },
  'shadow-soft': {
    label: 'Soft Shadow',
    previewColor: '#ffffff',
    previewBg: '#1a1a1a',
    shadowEnabled: true,
    shadowColor: 'rgba(0,0,0,0.8)',
    shadowBlur: 12,
    shadowOffsetX: 2,
    shadowOffsetY: 4,
    shadowOpacity: 0.9,
  },
  'shadow-hard': {
    label: 'Hard Shadow',
    previewColor: '#ffffff',
    previewBg: '#1a1a1a',
    shadowEnabled: true,
    shadowColor: '#000000',
    shadowBlur: 0,
    shadowOffsetX: 3,
    shadowOffsetY: 3,
    shadowOpacity: 1,
  },
  fire: {
    label: 'Fire',
    previewColor: '#FDE047',
    previewBg: '#1a0500',
    fill: '#FDE047',
    shadowEnabled: true,
    shadowColor: 'rgba(239,68,68,0.9)',
    shadowBlur: 16,
    shadowOffsetX: 0,
    shadowOffsetY: 2,
    shadowOpacity: 1,
    stroke: '#F97316',
    strokeWidth: 1,
  },
  ice: {
    label: 'Ice',
    previewColor: '#BAE6FD',
    previewBg: '#030f1a',
    fill: '#BAE6FD',
    shadowEnabled: true,
    shadowColor: 'rgba(56,189,248,0.85)',
    shadowBlur: 14,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowOpacity: 1,
    stroke: '#7DD3FC',
    strokeWidth: 0.5,
  },
  retro: {
    label: 'Retro',
    previewColor: '#FDE047',
    previewBg: '#18100a',
    fill: '#FDE047',
    stroke: '#1e3a5f',
    strokeWidth: 3,
    shadowEnabled: true,
    shadowColor: '#1e3a5f',
    shadowBlur: 0,
    shadowOffsetX: 4,
    shadowOffsetY: 4,
    shadowOpacity: 1,
  },
};

export const TEXT_EFFECT_IDS: CanvasTextEffectId[] = Object.keys(TEXT_EFFECTS) as CanvasTextEffectId[];

export function getEffectProps(effectId: CanvasTextEffectId | undefined): Partial<TextEffectConfig> {
  if (!effectId || effectId === 'none') return {};
  return TEXT_EFFECTS[effectId] ?? {};
}
