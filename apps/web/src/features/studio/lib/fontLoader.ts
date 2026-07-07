import { isLocalFont, loadLocalFont } from '@/assets/support';
import {
  getSystemFontMeta,
  isLocalFontAccessSupported,
  loadSystemFont,
  registerSystemFontFamily,
} from '@/features/studio/lib/localFonts';
import { loadFullFont } from '@/features/studio/fonts/fontAtlas';
import { isSystemFontFamily } from '@/features/studio/fonts/systemFonts';
import type { StudioFontLoadOptions } from '@/features/studio/fonts/types';
import { normalizeSubtitleFontFamily } from '@/features/studio/fonts/fontStack';
import type { CanvasElement } from '@/types/canvas';

const loaded = new Set<string>();

function loadKey(family: string, options?: StudioFontLoadOptions): string {
  return `${family}::${options?.fontWeight ?? 'normal'}::${options?.fontStyle ?? 'normal'}`;
}

/**
 * Load a studio font — bundled assets, system faces, or Google Fonts (weight/italic aware).
 */
export async function loadStudioFont(
  family: string,
  options?: StudioFontLoadOptions,
): Promise<void> {
  const normalized = normalizeSubtitleFontFamily(family) ?? family.trim();
  if (!normalized) return;

  const key = loadKey(normalized, options);
  if (loaded.has(key)) return;

  const systemMeta = getSystemFontMeta(normalized);
  if (systemMeta) {
    const ok = await loadSystemFont(systemMeta);
    if (ok) {
      loaded.add(key);
      return;
    }
  }

  if (isLocalFontAccessSupported() && !isLocalFont(normalized) && !isSystemFontFamily(normalized)) {
    try {
      const all = await window.queryLocalFonts!();
      const match = all.find((f) => f.family === normalized);
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
          loaded.add(key);
          return;
        }
      }
    } catch {
      /* fall through */
    }
  }

  if (isLocalFont(normalized)) {
    await loadLocalFont(normalized);
    loaded.add(key);
    return;
  }

  if (isSystemFontFamily(normalized)) {
    loaded.add(key);
    return;
  }

  await loadFullFont({
    family: normalized,
    italic: options?.fontStyle === 'italic',
    weights: options?.fontWeight === 'bold' ? [400, 700] : [400, 700],
  });
  loaded.add(key);
}

/** @deprecated Use `loadStudioFont` — kept for existing call sites. */
export const loadGoogleFont = loadStudioFont;

export function isStudioFontLoaded(family: string, options?: StudioFontLoadOptions): boolean {
  return loaded.has(loadKey(normalizeSubtitleFontFamily(family) ?? family, options));
}

export function isGoogleFontLoaded(family: string): boolean {
  return isStudioFontLoaded(family);
}

/** Preload fonts used by canvas text elements (preview, WASM, export). */
export async function ensureFontsForCanvasElements(elements: CanvasElement[]): Promise<void> {
  const tasks = elements
    .filter((el) => el.type === 'text' || el.type === 'overlay')
    .map((el) =>
      loadStudioFont(el.fontFamily ?? '', {
        fontWeight: el.textStyle?.fontWeight,
        fontStyle: el.textStyle?.fontStyle,
      }),
    );
  await Promise.all(tasks);
}

/** Preload a list of fonts. Fire-and-forget. */
export function preloadFonts(
  families: string[],
  options?: StudioFontLoadOptions,
): void {
  for (const family of families) {
    void loadStudioFont(family, options);
  }
}
