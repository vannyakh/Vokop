/** Browser Local Font Access API — https://developer.mozilla.org/en-US/docs/Web/API/Local_Font_Access_API */

export interface SystemFontMetadata {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
}

export function isLocalFontAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'queryLocalFonts' in window;
}

/** Unique families (one entry per family, prefer "Regular" / "normal" style when present). */
export function dedupeSystemFontFamilies(fonts: SystemFontMetadata[]): SystemFontMetadata[] {
  const byFamily = new Map<string, SystemFontMetadata>();
  for (const font of fonts) {
    const existing = byFamily.get(font.family);
    if (!existing) {
      byFamily.set(font.family, font);
      continue;
    }
    const prefer =
      /regular|normal|400/i.test(font.fullName) && !/regular|normal|400/i.test(existing.fullName);
    if (prefer) byFamily.set(font.family, font);
  }
  return [...byFamily.values()].sort((a, b) => a.family.localeCompare(b.family));
}

export async function requestSystemFonts(): Promise<{
  fonts: SystemFontMetadata[];
  deniedMessage?: string;
}> {
  if (!isLocalFontAccessSupported()) {
    return { fonts: [], deniedMessage: 'System fonts are not supported in this browser.' };
  }

  try {
    const status = await navigator.permissions.query({ name: 'local-fonts' as PermissionName });
    if (status.state === 'denied') {
      return {
        fonts: [],
        deniedMessage:
          'To use system fonts, allow font access in your browser site settings for this page.',
      };
    }

    const raw = await window.queryLocalFonts!();
    const fonts = dedupeSystemFontFamilies(
      raw.map((f) => ({
        family: f.family,
        fullName: f.fullName,
        postscriptName: f.postscriptName,
        style: f.style,
      })),
    );
    return { fonts };
  } catch {
    return {
      fonts: [],
      deniedMessage: 'Could not access system fonts. Grant permission when prompted.',
    };
  }
}

const loadedSystem = new Set<string>();
const familyRegistry = new Map<string, SystemFontMetadata>();

export function registerSystemFontFamily(meta: SystemFontMetadata): void {
  familyRegistry.set(meta.family, meta);
}

export function getSystemFontMeta(family: string): SystemFontMetadata | undefined {
  return familyRegistry.get(family);
}

export function isRegisteredSystemFont(family: string): boolean {
  return familyRegistry.has(family);
}

/** Load a system font face via the Local Font Access API (cached by postscript name). */
export async function loadSystemFont(meta: SystemFontMetadata): Promise<boolean> {
  if (loadedSystem.has(meta.postscriptName)) return true;
  if (!isLocalFontAccessSupported()) return false;

  try {
    const all = await window.queryLocalFonts!();
    const match =
      all.find((f) => f.postscriptName === meta.postscriptName) ??
      all.find((f) => f.family === meta.family);
    if (!match) return false;

    const blob = await match.blob();
    const face = new FontFace(meta.family, await blob.arrayBuffer());
    await face.load();
    document.fonts.add(face);
    loadedSystem.add(meta.postscriptName);
    return true;
  } catch {
    return false;
  }
}

export function isSystemFontLoaded(postscriptName: string): boolean {
  return loadedSystem.has(postscriptName);
}
