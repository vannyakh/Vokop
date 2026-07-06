/**
 * FPS-aware timeline ruler — adapted from OpenCut `@templates/OpenCut/apps/web/src/timeline/ruler-utils.ts`.
 */

import { DEFAULT_TIMELINE_FPS } from '@vokop/editor';

const LABEL_FRAME_INTERVALS = [2, 3, 5, 10, 15] as const;
const TICK_FRAME_INTERVALS = [1, 2, 3, 5, 10, 15] as const;
const SECOND_MULTIPLIERS = [
  1, 2, 3, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600,
] as const;

const MIN_LABEL_SPACING_PX = 120;
const MIN_TICK_SPACING_PX = 18;

export interface TimelineRulerConfig {
  labelIntervalSeconds: number;
  tickIntervalSeconds: number;
}

export interface TimelineRulerTicks {
  majorTicks: number[];
  minorTicks: number[];
  /** Show frame-style labels (e.g. `5f`) between second boundaries. */
  frameLabels: boolean;
  config: TimelineRulerConfig;
}

export function getTimelineRulerConfig({
  pxPerSec,
  fps = DEFAULT_TIMELINE_FPS,
}: {
  pxPerSec: number;
  fps?: number;
}): TimelineRulerConfig {
  const pixelsPerFrame = pxPerSec / fps;

  const labelIntervalSeconds = findOptimalInterval({
    pixelsPerFrame,
    pixelsPerSecond: pxPerSec,
    fps,
    minSpacingPx: MIN_LABEL_SPACING_PX,
    frameIntervals: LABEL_FRAME_INTERVALS,
  });

  const rawTickIntervalSeconds = findOptimalInterval({
    pixelsPerFrame,
    pixelsPerSecond: pxPerSec,
    fps,
    minSpacingPx: MIN_TICK_SPACING_PX,
    frameIntervals: TICK_FRAME_INTERVALS,
  });

  const tickIntervalSeconds = ensureTickDividesLabel({
    tickIntervalSeconds: rawTickIntervalSeconds,
    labelIntervalSeconds,
    pixelsPerFrame,
    pixelsPerSecond: pxPerSec,
    fps,
  });

  return { labelIntervalSeconds, tickIntervalSeconds };
}

export function buildTimelineRulerTicks(
  spanSec: number,
  pxPerSec: number,
  fps = DEFAULT_TIMELINE_FPS,
): TimelineRulerTicks {
  if (!spanSec) {
    return {
      majorTicks: [0],
      minorTicks: [],
      frameLabels: false,
      config: { labelIntervalSeconds: 1, tickIntervalSeconds: 1 },
    };
  }

  const config = getTimelineRulerConfig({ pxPerSec, fps });
  const frameLabels = config.labelIntervalSeconds < 1;

  const majorTicks: number[] = [];
  const labelMs = Math.max(1, Math.round(config.labelIntervalSeconds * 1000));
  const spanMs = Math.ceil(spanSec * 1000);
  for (let ms = 0; ms <= spanMs + labelMs; ms += labelMs) {
    majorTicks.push(ms / 1000);
  }

  const majorSet = new Set(majorTicks.map((t) => Math.round(t * 1000)));
  const minorTicks: number[] = [];
  const tickMs = Math.max(1, Math.round(config.tickIntervalSeconds * 1000));
  for (let ms = 0; ms <= spanMs + tickMs; ms += tickMs) {
    if (majorSet.has(ms)) continue;
    minorTicks.push(ms / 1000);
  }

  return { majorTicks, minorTicks, frameLabels, config };
}

export function formatTimelineRulerLabel(
  timeSec: number,
  options?: { fps?: number; frameLabels?: boolean; compact?: boolean },
): string {
  const fps = options?.fps ?? DEFAULT_TIMELINE_FPS;
  const safe = Math.max(0, timeSec);

  if (options?.frameLabels && !isSecondBoundary(safe)) {
    const frameWithinSecond = Math.round((safe % 1) * fps);
    return `${frameWithinSecond}f`;
  }

  if (safe < 3600) {
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    if (options?.frameLabels === false && options?.compact && safe < 60) {
      return `${s.toFixed(1).replace(/\.0$/, '')}s`;
    }
    if (options?.compact) {
      return `${m}:${Math.floor(s).toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${Math.floor(s).toString().padStart(2, '0')}`;
  }

  const h = Math.floor(safe / 3600);
  const rem = safe % 3600;
  const m = Math.floor(rem / 60);
  const s = Math.floor(rem % 60);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function isSecondBoundary(timeSec: number): boolean {
  const epsilon = 0.0001;
  const remainder = timeSec % 1;
  return remainder < epsilon || remainder > 1 - epsilon;
}

function ensureTickDividesLabel(input: {
  tickIntervalSeconds: number;
  labelIntervalSeconds: number;
  pixelsPerFrame: number;
  pixelsPerSecond: number;
  fps: number;
}): number {
  const labelFrames = Math.round(input.labelIntervalSeconds * input.fps);
  const tickFrames = Math.round(input.tickIntervalSeconds * input.fps);

  if (labelFrames > 0 && tickFrames > 0 && labelFrames % tickFrames === 0) {
    return input.tickIntervalSeconds;
  }

  for (const candidateFrames of TICK_FRAME_INTERVALS) {
    if (labelFrames % candidateFrames === 0) {
      const candidateSpacing = input.pixelsPerFrame * candidateFrames;
      if (candidateSpacing >= MIN_TICK_SPACING_PX) {
        return candidateFrames / input.fps;
      }
    }
  }

  for (const candidateSeconds of SECOND_MULTIPLIERS) {
    const ratio = input.labelIntervalSeconds / candidateSeconds;
    const isDivisor = Math.abs(ratio - Math.round(ratio)) < 0.0001;
    if (isDivisor) {
      const candidateSpacing = input.pixelsPerSecond * candidateSeconds;
      if (candidateSpacing >= MIN_TICK_SPACING_PX) {
        return candidateSeconds;
      }
    }
  }

  return input.labelIntervalSeconds;
}

function findOptimalInterval(input: {
  pixelsPerFrame: number;
  pixelsPerSecond: number;
  fps: number;
  minSpacingPx: number;
  frameIntervals: readonly number[];
}): number {
  for (const frameInterval of input.frameIntervals) {
    const pixelSpacing = input.pixelsPerFrame * frameInterval;
    if (pixelSpacing >= input.minSpacingPx) {
      return frameInterval / input.fps;
    }
  }

  for (const secondMultiplier of SECOND_MULTIPLIERS) {
    const pixelSpacing = input.pixelsPerSecond * secondMultiplier;
    if (pixelSpacing >= input.minSpacingPx) {
      return secondMultiplier;
    }
  }

  return 60;
}
