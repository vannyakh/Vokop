/**
 * Bundled studio fonts from `apps/web/src/assets/fonts`.
 * Loaded via `assets/fonts/studio-fonts.css` — no network request.
 */

export type LocalFontCategory = 'sans-serif' | 'display' | 'emoji' | 'khmer';

export interface LocalFont {
  family: string;
  category: LocalFontCategory;
  /** Shown in the font picker. */
  label?: string;
  source: 'local';
}

export const LOCAL_FONTS: LocalFont[] = [
  { family: 'Poppins', category: 'sans-serif', source: 'local' },
  { family: 'Kantumruy Pro', category: 'sans-serif', label: 'Kantumruy Pro', source: 'local' },
  { family: 'Nippo', category: 'display', source: 'local' },
  { family: 'Noto Emoji', category: 'emoji', label: 'Noto Emoji', source: 'local' },
];

const LOCAL_FAMILY_SET = new Set(LOCAL_FONTS.map((f) => f.family));

export function isLocalFont(family: string): boolean {
  return LOCAL_FAMILY_SET.has(family);
}

/** Local fonts are registered by CSS; wait for the document font set. */
export async function loadLocalFont(family: string): Promise<void> {
  if (!isLocalFont(family)) return;
  await document.fonts.ready;
  // Warm the family so canvas/text measurements use the real face.
  try {
    await document.fonts.load(`400 16px "${family}"`);
  } catch {
    // ignore — family may still render via fallback
  }
}

export function preloadLocalFonts(): void {
  for (const font of LOCAL_FONTS) {
    void loadLocalFont(font.family);
  }
}
