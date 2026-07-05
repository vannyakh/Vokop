import { isLocalFont, loadLocalFont } from '@/assets/support';
import {
  getSystemFontMeta,
  isLocalFontAccessSupported,
  loadSystemFont,
  registerSystemFontFamily,
} from '@/features/studio/lib/localFonts';

const loaded = new Set<string>();
const pending = new Set<string>();

/**
 * Load a studio font — prefers bundled assets (`Poppins`, `Nippo`, `Noto Emoji`),
 * falls back to Google Fonts for remote families.
 */
export async function loadStudioFont(family: string): Promise<void> {
  if (loaded.has(family)) return;

  const systemMeta = getSystemFontMeta(family);
  if (systemMeta) {
    const ok = await loadSystemFont(systemMeta);
    if (ok) {
      loaded.add(family);
      return;
    }
  }

  if (isLocalFontAccessSupported() && !isLocalFont(family)) {
    try {
      const all = await window.queryLocalFonts!();
      const match = all.find((f) => f.family === family);
      if (match) {
        const meta = {
          family: match.family,
          fullName: match.fullName,
          postscriptName: match.postscriptName,
          style: match.style,
        };
        registerSystemFontFamily(meta);
        const ok = await loadSystemFont(meta);
        if (ok) {
          loaded.add(family);
          return;
        }
      }
    } catch {
      /* fall through to bundled / Google fonts */
    }
  }

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
