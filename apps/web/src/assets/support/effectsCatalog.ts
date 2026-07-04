/**
 * Effects library catalog (CapCut-style categories).
 *
 * Drop preview images into `apps/web/src/assets/effects/previews/` using the
 * item `id` as the filename, e.g. `text-fireworks-ii.webp`.
 * Supported extensions: .webp .png .jpg .jpeg .gif .awebp
 *
 * `applyId` maps a card click to a real editor effect preset.
 */

export type EffectApplyId = 'none' | 'vignette' | 'grain' | 'sharpen' | 'glow' | 'mirror';

export interface EffectCatalogItem {
  id: string;
  label: string;
  categoryId: string;
  /** Editor preset applied when the card is selected. */
  applyId: EffectApplyId;
  pro?: boolean;
}

export interface EffectCatalogCategory {
  id: string;
  label: string;
}

export const EFFECT_CATALOG_CATEGORIES: EffectCatalogCategory[] = [
  { id: 'trending', label: 'Trending' },
  { id: 'classic', label: 'Classic' },
  { id: 'hits', label: 'Hits' },
  { id: 'intro-outro', label: 'Intro & Outro' },
  { id: 'party', label: 'Party' },
  { id: 'motion', label: 'Motion' },
  { id: 'light', label: 'Light' },
  { id: 'retro', label: 'Retro' },
  { id: 'glitch', label: 'Glitch' },
  { id: 'texture', label: 'Texture' },
];

export const EFFECT_CATALOG_ITEMS: EffectCatalogItem[] = [
  // Trending
  { id: 'text-fireworks-ii', label: 'Text Fireworks II', categoryId: 'trending', applyId: 'glow' },
  { id: 'text-fireworks', label: 'Text Fireworks', categoryId: 'trending', applyId: 'glow', pro: true },
  { id: 'bouncing-snow', label: 'Bouncing Snow', categoryId: 'trending', applyId: 'grain' },
  { id: 'sweet-xmas', label: 'Sweet Xmas', categoryId: 'trending', applyId: 'vignette' },
  { id: '12-grapes', label: '12 Grapes', categoryId: 'trending', applyId: 'sharpen' },
  { id: 'buffer-overload', label: 'Buffer Overload', categoryId: 'trending', applyId: 'mirror' },
  { id: 'gift-shower', label: 'Gift Shower', categoryId: 'trending', applyId: 'glow' },
  { id: 'golden-bigbang', label: 'Golden Bigbang', categoryId: 'trending', applyId: 'glow', pro: true },
  { id: 'popping-cards', label: 'Popping Cards', categoryId: 'trending', applyId: 'sharpen', pro: true },
  { id: 'firespark-cube', label: 'Firespark Cube', categoryId: 'trending', applyId: 'glow', pro: true },

  // Classic
  { id: 'colors-off', label: 'Colors Off', categoryId: 'classic', applyId: 'none', pro: true },
  { id: 'nine-screens', label: 'Nine Screens', categoryId: 'classic', applyId: 'mirror' },
  { id: 'blurred-love', label: 'Blurred Love', categoryId: 'classic', applyId: 'glow', pro: true },
  { id: 'four-screens', label: 'Four Screens', categoryId: 'classic', applyId: 'mirror' },
  { id: 'halo-blur', label: 'Halo Blur', categoryId: 'classic', applyId: 'glow', pro: true },
  { id: 'square-blur', label: 'Square Blur', categoryId: 'classic', applyId: 'glow', pro: true },
  { id: 'colorize-bw', label: 'Colorize B&W', categoryId: 'classic', applyId: 'none', pro: true },
  { id: 'super-large-spot', label: 'Super-large Spot', categoryId: 'classic', applyId: 'vignette', pro: true },

  // Hits
  { id: 'stars-orbit', label: 'Stars Orbit', categoryId: 'hits', applyId: 'glow' },
  { id: 'plank-flash', label: 'Plank Flash', categoryId: 'hits', applyId: 'sharpen' },
  { id: 'box-cut-flash', label: 'Box Cut Flash', categoryId: 'hits', applyId: 'mirror' },
  { id: 'windmill-tile', label: 'Windmill Tile', categoryId: 'hits', applyId: 'mirror' },
  { id: 'cutout-flash', label: 'Cutout Flash', categoryId: 'hits', applyId: 'sharpen' },
  { id: 'panel-flash', label: 'Panel Flash', categoryId: 'hits', applyId: 'glow' },
  { id: 'glass-flare', label: 'Glass Flare', categoryId: 'hits', applyId: 'glow' },
  { id: 'stellar-aura', label: 'Stellar Aura', categoryId: 'hits', applyId: 'glow' },

  // Intro & Outro
  { id: '3d-feed-scroll', label: '3D Feed Scroll', categoryId: 'intro-outro', applyId: 'mirror' },
  { id: 'cube-reflection', label: 'Cube Reflection', categoryId: 'intro-outro', applyId: 'mirror' },
  { id: 'instax-shot', label: 'Instax Shot', categoryId: 'intro-outro', applyId: 'vignette' },
  { id: 'vision-split', label: 'Vision Split', categoryId: 'intro-outro', applyId: 'mirror' },
  { id: 'glass-shine', label: 'Glass Shine', categoryId: 'intro-outro', applyId: 'glow' },
  { id: 'open-door', label: 'Open Door', categoryId: 'intro-outro', applyId: 'vignette' },
  { id: 'vintage-grid', label: 'Vintage Grid', categoryId: 'intro-outro', applyId: 'grain' },

  // Party
  { id: 'chromatic-shift', label: 'Chromatic Shift', categoryId: 'party', applyId: 'sharpen' },
  { id: 'inverted-shake', label: 'Inverted Shake', categoryId: 'party', applyId: 'mirror' },
  { id: 'pop-tone', label: 'Pop Tone', categoryId: 'party', applyId: 'glow' },
  { id: 'bright-flash', label: 'Bright Flash', categoryId: 'party', applyId: 'sharpen' },
  { id: 'textured-strobe', label: 'Textured Strobe', categoryId: 'party', applyId: 'grain' },
  { id: 'la-pink-flash', label: 'LA Pink Flash', categoryId: 'party', applyId: 'glow' },
  { id: 'dream-party', label: 'Dream Party', categoryId: 'party', applyId: 'glow' },

  // Motion
  { id: 'sway-glow', label: 'Sway Glow', categoryId: 'motion', applyId: 'glow' },
  { id: 'strange-world', label: 'Strange World', categoryId: 'motion', applyId: 'mirror' },
  { id: 'flashy-jelly', label: 'Flashy Jelly', categoryId: 'motion', applyId: 'glow' },
  { id: 'photo-zoom', label: 'Photo Zoom', categoryId: 'motion', applyId: 'sharpen' },
  { id: 'dynamic-bw', label: 'Dynamic BW', categoryId: 'motion', applyId: 'none' },
  { id: 'rage-boom', label: 'Rage Boom', categoryId: 'motion', applyId: 'sharpen' },

  // Light
  { id: 'trapped-by-fire', label: 'Trapped by Fire', categoryId: 'light', applyId: 'glow' },
  { id: 'dazzling-event', label: 'Dazzling Event', categoryId: 'light', applyId: 'glow' },
  { id: 'trippy-aura', label: 'Trippy Aura', categoryId: 'light', applyId: 'glow' },
  { id: 'red-glow', label: 'Red Glow', categoryId: 'light', applyId: 'glow' },
  { id: 'prism-aura', label: 'Prism Aura', categoryId: 'light', applyId: 'glow' },
  { id: 'fog-machine', label: 'Fog Machine', categoryId: 'light', applyId: 'vignette' },

  // Retro
  { id: 'crt-texture', label: 'CRT Texture', categoryId: 'retro', applyId: 'grain' },
  { id: 'damaged-photos', label: 'Damaged Photos', categoryId: 'retro', applyId: 'grain' },
  { id: 'retro-inversion', label: 'Retro Inversion', categoryId: 'retro', applyId: 'mirror' },
  { id: 'vintage-dark', label: 'Vintage Dark', categoryId: 'retro', applyId: 'vignette' },
  { id: 'antique-cinema', label: 'Antique Cinema', categoryId: 'retro', applyId: 'grain' },
  { id: 'old-video', label: 'Old Video', categoryId: 'retro', applyId: 'grain' },
  { id: 'noir-noise', label: 'Noir Noise', categoryId: 'retro', applyId: 'grain' },

  // Glitch
  { id: 'prism-waves', label: 'Prism Waves', categoryId: 'glitch', applyId: 'sharpen' },
  { id: 'pixel-mosaic', label: 'Pixel Mosaic', categoryId: 'glitch', applyId: 'mirror' },
  { id: 'broken-signal', label: 'Broken Signal', categoryId: 'glitch', applyId: 'grain' },
  { id: 'signal-glitch', label: 'Signal Glitch', categoryId: 'glitch', applyId: 'sharpen' },
  { id: 'fuzzy-glitch', label: 'Fuzzy Glitch', categoryId: 'glitch', applyId: 'grain' },
  { id: 'rgb-map', label: 'RGB Map', categoryId: 'glitch', applyId: 'sharpen' },

  // Texture
  { id: 'posterized', label: 'Posterized', categoryId: 'texture', applyId: 'sharpen' },
  { id: 'halftone-invert', label: 'Halftone Invert', categoryId: 'texture', applyId: 'mirror' },
  { id: 'carbon-static', label: 'Carbon Static', categoryId: 'texture', applyId: 'grain' },
  { id: 'grainy-flicker', label: 'Grainy Flicker', categoryId: 'texture', applyId: 'grain' },
  { id: 'static-grain', label: 'Static Grain', categoryId: 'texture', applyId: 'grain' },
  { id: 'film-grain', label: 'Film Grain', categoryId: 'texture', applyId: 'grain' },
];

export const EFFECT_QUICK_TAGS = [
  { id: 'all', label: 'All' },
  ...EFFECT_CATALOG_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
] as const;
