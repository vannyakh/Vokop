/** Central registry for persisted studio panel layout (OpenCut-style panel store). */

export const STUDIO_LAYOUT_KEYS = [
  'vokop-timeline-dock-height',
  'vokop-left-panel-width',
  'vokop-right-panel-width',
  'vokop-timeline-header-width',
] as const;

export const STUDIO_LAYOUT_RESET_EVENT = 'vokop:layout-reset';

/** Clear stored panel sizes and notify layout hooks to fall back to defaults. */
export function resetStudioPanelLayout(): void {
  try {
    for (const key of STUDIO_LAYOUT_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(STUDIO_LAYOUT_RESET_EVENT));
}
