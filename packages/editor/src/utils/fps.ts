/**
 * Project frame-rate helpers — adapted from OpenCut `src/fps`.
 * Complements `mediaTime.ts` (FrameRate math) with UI presets and
 * "raise project fps to match imported media" logic.
 */

import type { FrameRate } from './mediaTime.js';
import { frameRateAsNumber, frameRateFromNumber } from './mediaTime.js';

/** Frame-rate options for project settings / export UI. */
export const FPS_PRESETS = [
  { value: '24', label: '24 fps' },
  { value: '25', label: '25 fps' },
  { value: '30', label: '30 fps' },
  { value: '60', label: '60 fps' },
  { value: '120', label: '120 fps' },
] as const;

export interface MediaAssetFpsInput {
  type: string;
  fps?: number | null;
}

/** Highest valid fps among imported video assets, or null when none report one. */
export function getHighestImportedVideoFps(mediaAssets: MediaAssetFpsInput[]): number | null {
  let highestFps: number | null = null;

  for (const asset of mediaAssets) {
    if (asset.type !== 'video') continue;
    const fps = asset.fps ?? Number.NaN;
    if (!Number.isFinite(fps) || fps <= 0) continue;
    highestFps = highestFps === null ? fps : Math.max(highestFps, fps);
  }

  return highestFps;
}

/**
 * When imported media plays faster than the current project fps, return the
 * raised FrameRate the project should adopt; otherwise null (keep current).
 */
export function getRaisedProjectFpsForImportedMedia(options: {
  currentFps: FrameRate;
  importedAssets: MediaAssetFpsInput[];
}): FrameRate | null {
  const highestImportedVideoFps = getHighestImportedVideoFps(options.importedAssets);
  const currentFpsFloat = frameRateAsNumber(options.currentFps) ?? 0;

  if (highestImportedVideoFps === null || highestImportedVideoFps <= currentFpsFloat) {
    return null;
  }

  return frameRateFromNumber(highestImportedVideoFps);
}
