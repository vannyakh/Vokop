import type { CanvasTextEffectId } from '../types/canvas.js';

export type TextEffectCategory = 'glow' | 'outline' | 'shadow' | 'creative';

export interface TextEffectSeed {
  effectId: CanvasTextEffectId;
  category: TextEffectCategory;
  /** Pixabay search query used to fetch a preview background */
  previewQuery: string;
  sampleText: string;
}

export const TEXT_EFFECT_CATEGORIES: { id: TextEffectCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'glow', label: 'Glow' },
  { id: 'outline', label: 'Outline' },
  { id: 'shadow', label: 'Shadow' },
  { id: 'creative', label: 'Creative' },
];

export const TEXT_EFFECT_SEEDS: TextEffectSeed[] = [
  { effectId: 'glow-teal', category: 'glow', previewQuery: 'ocean sunset waves', sampleText: 'Waves' },
  { effectId: 'glow-orange', category: 'glow', previewQuery: 'city night lights', sampleText: 'Night' },
  { effectId: 'neon-pink', category: 'glow', previewQuery: 'neon sign street', sampleText: 'Neon' },
  { effectId: 'outline-white', category: 'outline', previewQuery: 'mountain landscape', sampleText: 'Summit' },
  { effectId: 'outline-black', category: 'outline', previewQuery: 'beach sand sky', sampleText: 'Coast' },
  { effectId: 'shadow-soft', category: 'shadow', previewQuery: 'forest trees mist', sampleText: 'Forest' },
  { effectId: 'shadow-hard', category: 'shadow', previewQuery: 'urban architecture', sampleText: 'Urban' },
  { effectId: 'fire', category: 'creative', previewQuery: 'campfire flames dark', sampleText: 'Blaze' },
  { effectId: 'ice', category: 'creative', previewQuery: 'snow winter glacier', sampleText: 'Frost' },
  { effectId: 'retro', category: 'creative', previewQuery: 'vintage retro diner', sampleText: 'Retro' },
];

export function getTextEffectSeed(effectId: CanvasTextEffectId): TextEffectSeed | undefined {
  return TEXT_EFFECT_SEEDS.find((s) => s.effectId === effectId);
}
