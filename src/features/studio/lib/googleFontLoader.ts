const loaded = new Set<string>();
const pending = new Set<string>();

/**
 * Inject a Google Fonts stylesheet for the given font family.
 * Returns a promise that resolves once the font is loaded into the document.
 */
export async function loadGoogleFont(family: string): Promise<void> {
  if (loaded.has(family)) return;
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

export function isGoogleFontLoaded(family: string): boolean {
  return loaded.has(family);
}

/** Preload a list of fonts. Fire-and-forget. */
export function preloadFonts(families: string[]): void {
  for (const f of families) {
    void loadGoogleFont(f);
  }
}
