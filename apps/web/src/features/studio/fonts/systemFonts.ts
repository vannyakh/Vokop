import { LOCAL_FONTS } from '@/assets/support';

/** Web-safe + generic families (OpenCut `@templates/OpenCut/.../system-fonts.ts`). */
export const SYSTEM_FONT_FAMILIES = new Set([
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Georgia',
  'Trebuchet MS',
  'Impact',
  'Comic Sans MS',
  'monospace',
  'sans-serif',
  'serif',
  ...LOCAL_FONTS.map((f) => f.family),
]);

export function isSystemFontFamily(family: string): boolean {
  return SYSTEM_FONT_FAMILIES.has(family);
}
