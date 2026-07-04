import { LOCAL_FONTS } from '@/assets/support';

export interface StudioFont {
  family: string;
  category: 'sans-serif' | 'serif' | 'display' | 'handwriting' | 'monospace' | 'emoji';
  previewText?: string;
  /** Bundled under `apps/web/src/assets/fonts` when true. */
  local?: boolean;
}

/** Remote Google Fonts (loaded on demand). */
const REMOTE_FONTS: StudioFont[] = [
  { family: 'Montserrat', category: 'sans-serif' },
  { family: 'Oswald', category: 'sans-serif' },
  { family: 'Raleway', category: 'sans-serif' },
  { family: 'Nunito', category: 'sans-serif' },
  { family: 'Ubuntu', category: 'sans-serif' },
  { family: 'Bebas Neue', category: 'display' },
  { family: 'Anton', category: 'display' },
  { family: 'Righteous', category: 'display' },
  { family: 'Orbitron', category: 'display' },
  { family: 'Playfair Display', category: 'serif' },
  { family: 'Merriweather', category: 'serif' },
  { family: 'Dancing Script', category: 'handwriting' },
  { family: 'Pacifico', category: 'handwriting' },
  { family: 'Lobster', category: 'handwriting' },
  { family: 'Space Mono', category: 'monospace' },
];

/** Local assets first, then remote Google Fonts. */
export const STUDIO_FONTS: StudioFont[] = [
  ...LOCAL_FONTS.map((f) => ({
    family: f.family,
    category: f.category === 'emoji' ? ('emoji' as const) : f.category,
    local: true as const,
  })),
  ...REMOTE_FONTS,
];

/** @deprecated Prefer `STUDIO_FONTS`. */
export const GOOGLE_FONTS = STUDIO_FONTS;

export const FONT_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'sans-serif', label: 'Sans-serif' },
  { id: 'display', label: 'Display' },
  { id: 'serif', label: 'Serif' },
  { id: 'handwriting', label: 'Script' },
  { id: 'monospace', label: 'Mono' },
  { id: 'emoji', label: 'Emoji' },
] as const;

export type FontCategoryId = (typeof FONT_CATEGORIES)[number]['id'];
