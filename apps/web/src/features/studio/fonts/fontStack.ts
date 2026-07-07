const DEFAULT_TEXT_STACK = '"Poppins", "Kantumruy Pro", "Noto Sans", system-ui, sans-serif';

/** Normalize ASS / subtitle font names to a picker-loadable family. */
export function normalizeSubtitleFontFamily(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  let name = raw.trim().replace(/^["']|["']$/g, '');
  name = name.replace(/\s+(Bold Italic|Bold|Italic|Regular|Normal|Medium|Light)$/i, '').trim();
  return name || undefined;
}

export function resolveStudioFontStack(
  family: string | undefined,
  fallback = DEFAULT_TEXT_STACK,
): string {
  const normalized = normalizeSubtitleFontFamily(family);
  if (!normalized) return fallback;
  return `"${normalized.replace(/"/g, '\\"')}", "Noto Sans", system-ui, sans-serif`;
}
