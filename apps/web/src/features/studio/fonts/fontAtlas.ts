import type { FontAtlas } from '@/features/studio/fonts/types';
import { isLocalFont, loadLocalFont } from '@/assets/support';
import { isSystemFontFamily } from '@/features/studio/fonts/systemFonts';

const GOOGLE_FONTS_CSS = 'https://fonts.googleapis.com/css2';
const FONT_ATLAS_PATH = '/fonts/font-atlas.json';
const FONT_CHUNK_PATH_PREFIX = '/fonts/font-chunk-';

const fullLoaded = new Set<string>();

let cachedAtlas: FontAtlas | null = null;
let atlasFetchPromise: Promise<FontAtlas | null> | null = null;

function encodeGoogleFontsFamily(family: string): string {
  return family.replace(/ /g, '+');
}

function buildGoogleFontsUrl(familyParam: string, weights: number[], italic: boolean): string {
  if (!italic) {
    return `${GOOGLE_FONTS_CSS}?family=${familyParam}:wght@${weights.join(';')}&display=swap`;
  }
  const axis = weights.flatMap((weight) => [`0,${weight}`, `1,${weight}`]).join(';');
  return `${GOOGLE_FONTS_CSS}?family=${familyParam}:ital,wght@${axis}&display=swap`;
}

function fontLoadKey(family: string, weights: number[], italic: boolean): string {
  return `${family}::${weights.join(',')}::${italic ? 'i' : 'n'}`;
}

export function getCachedFontAtlas(): FontAtlas | null {
  return cachedAtlas;
}

export function clearFontAtlasCache(): void {
  cachedAtlas = null;
  atlasFetchPromise = null;
  fullLoaded.clear();
}

export function loadFontAtlas(): Promise<FontAtlas | null> {
  if (cachedAtlas) return Promise.resolve(cachedAtlas);
  if (atlasFetchPromise) return atlasFetchPromise;

  atlasFetchPromise = fetch(FONT_ATLAS_PATH)
    .then(async (response) => {
      if (!response.ok) return null;
      const data: FontAtlas = await response.json();
      cachedAtlas = data;
      preloadChunkImages(data);
      return data;
    })
    .catch(() => null);

  return atlasFetchPromise;
}

function preloadChunkImages(atlas: FontAtlas): void {
  const maxChunk = Math.max(...Object.values(atlas.fonts).map((entry) => entry.ch), 0);
  for (let i = 0; i <= maxChunk; i += 1) {
    const img = new Image();
    img.src = `${FONT_CHUNK_PATH_PREFIX}${i}.avif`;
  }
}

export function atlasWeightsForFamily(atlas: FontAtlas | null, family: string): number[] {
  const styles = atlas?.fonts[family]?.s;
  if (!styles?.length) return [400, 700];
  const weights = new Set<number>();
  for (const token of styles) {
    const numeric = parseInt(token.replace(/i$/i, ''), 10);
    if (Number.isFinite(numeric) && numeric > 0) weights.add(numeric);
  }
  const out = [...weights].sort((a, b) => a - b);
  return out.length > 0 ? out : [400, 700];
}

export function atlasSupportsItalic(atlas: FontAtlas | null, family: string): boolean {
  return atlas?.fonts[family]?.s.some((token) => token.endsWith('i')) ?? false;
}

export async function loadFullFont(input: {
  family: string;
  weights?: number[];
  italic?: boolean;
}): Promise<void> {
  const atlas = cachedAtlas ?? (await loadFontAtlas());
  const weights = input.weights ?? atlasWeightsForFamily(atlas, input.family);
  const italic = input.italic ?? false;
  const key = fontLoadKey(input.family, weights, italic);
  if (fullLoaded.has(key)) return;

  if (isLocalFont(input.family)) {
    await loadLocalFont(input.family);
    fullLoaded.add(key);
    return;
  }

  if (isSystemFontFamily(input.family)) {
    fullLoaded.add(key);
    return;
  }

  const familyParam = encodeGoogleFontsFamily(input.family);
  const url = buildGoogleFontsUrl(familyParam, weights, italic);

  const id = `gf-${input.family.replace(/\s+/g, '-').toLowerCase()}-${italic ? 'i' : 'n'}`;
  if (!document.getElementById(id)) {
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
    await new Promise<void>((resolve) => {
      link.addEventListener('load', () => resolve(), { once: true });
      link.addEventListener('error', () => resolve(), { once: true });
    });
  }

  const escaped = input.family.replace(/"/g, '\\"');
  const loads: Promise<FontFace[]>[] = [];
  for (const weight of weights) {
    loads.push(document.fonts.load(`${weight} 16px "${escaped}"`));
    if (italic) loads.push(document.fonts.load(`italic ${weight} 16px "${escaped}"`));
  }
  await Promise.all(loads);
  fullLoaded.add(key);
}
