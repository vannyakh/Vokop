import { isLocalFont, loadLocalFont } from '@/assets/support';

const loaded = new Set<string>();
const pending = new Set<string>();

/**
 * Load a studio font — prefers bundled assets (`Poppins`, `Nippo`, `Noto Emoji`),
 * falls back to Google Fonts for remote families.
 */
export async function loadStudioFont(family: string): Promise<void> {
  if (loaded.has(family)) return;

  if (isLocalFont(family)) {
    await loadLocalFont(family);
    loaded.add(family);
    return;
  }

  if (!pending.has(family)) {
    pending.add(family);
    const id = `gf-${family.replace(/\s+/g, '-').toLowerCase()}`;
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;700&display=swap`;
      document.head.appendChild(link);
    }
  }

  await document.fonts.ready;
  loaded.add(family);
}

/** @deprecated Use `loadStudioFont` — kept for existing call sites. */
export const loadGoogleFont = loadStudioFont;

export function isStudioFontLoaded(family: string): boolean {
  return loaded.has(family);
}

export function isGoogleFontLoaded(family: string): boolean {
  return isStudioFontLoaded(family);
}

/** Preload a list of fonts. Fire-and-forget. */
export function preloadFonts(families: string[]): void {
  for (const f of families) {
    void loadStudioFont(f);
  }
}
