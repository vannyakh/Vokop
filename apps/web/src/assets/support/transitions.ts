/**
 * Transition preview GIFs from `apps/web/src/assets/transitions`.
 */

const transitionModules = import.meta.glob('../transitions/output_*.gif', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

function indexFromPath(path: string): number | null {
  const match = path.match(/output_(\d+)\.gif$/);
  if (!match) return null;
  return Number(match[1]);
}

/** All bundled transition GIFs, sorted by output index. */
export const TRANSITION_PREVIEW_GIFS: string[] = Object.entries(transitionModules)
  .map(([path, url]) => ({ index: indexFromPath(path), url }))
  .filter((entry): entry is { index: number; url: string } => entry.index != null)
  .sort((a, b) => a.index - b.index)
  .map((entry) => entry.url);

/** Preset id → GIF index in `TRANSITION_PREVIEW_GIFS`. */
const PRESET_GIF_INDEX: Record<string, number> = {
  cut: 0,
  dissolve: 1,
  fade: 2,
  'wipe-left': 3,
  'wipe-right': 4,
  'slide-up': 5,
  'slide-down': 6,
  'zoom-in': 7,
  'zoom-out': 8,
  blur: 9,
  flash: 10,
  spin: 11,
};

export const TRANSITION_PREVIEW_BY_ID: Record<string, string> = Object.fromEntries(
  Object.entries(PRESET_GIF_INDEX).flatMap(([id, index]) => {
    const url = TRANSITION_PREVIEW_GIFS[index];
    return url ? [[id, url]] : [];
  }),
);

export function getTransitionPreview(presetId: string): string | undefined {
  return TRANSITION_PREVIEW_BY_ID[presetId] ?? TRANSITION_PREVIEW_GIFS[0];
}

export function getTransitionPreviewByIndex(index: number): string | undefined {
  return TRANSITION_PREVIEW_GIFS[index];
}
