/**
 * Frame-accurate timeline time — adapted from OpenCut `rust/crates/time`
 * (@templates/OpenCut sample). Uses 120k ticks/sec so common frame rates land on
 * exact integer tick boundaries (24, 25, 30, 29.97, 60, …).
 */

export const TICKS_PER_SECOND = 120_000;

/** Default preview / export frame rate for timeline snap. */
export const DEFAULT_TIMELINE_FPS = 30;

export interface FrameRate {
  numerator: number;
  denominator: number;
}

export const FRAME_RATE = {
  FPS_23_976: { numerator: 24_000, denominator: 1_001 },
  FPS_24: { numerator: 24, denominator: 1 },
  FPS_25: { numerator: 25, denominator: 1 },
  FPS_29_97: { numerator: 30_000, denominator: 1_001 },
  FPS_30: { numerator: 30, denominator: 1 },
  FPS_48: { numerator: 48, denominator: 1 },
  FPS_50: { numerator: 50, denominator: 1 },
  FPS_59_94: { numerator: 60_000, denominator: 1_001 },
  FPS_60: { numerator: 60, denominator: 1 },
  FPS_120: { numerator: 120, denominator: 1 },
} as const satisfies Record<string, FrameRate>;

export function frameRateFromNumber(fps: number): FrameRate {
  if (Math.abs(fps - 23.976) < 0.01) return FRAME_RATE.FPS_23_976;
  if (Math.abs(fps - 29.97) < 0.01) return FRAME_RATE.FPS_29_97;
  if (Math.abs(fps - 59.94) < 0.01) return FRAME_RATE.FPS_59_94;
  const rounded = Math.max(1, Math.round(fps));
  return { numerator: rounded, denominator: 1 };
}

export function frameRateAsNumber(rate: FrameRate): number | null {
  if (rate.numerator <= 0 || rate.denominator <= 0) return null;
  return rate.numerator / rate.denominator;
}

export function ticksPerFrame(rate: FrameRate): number | null {
  if (rate.numerator <= 0 || rate.denominator <= 0) return null;
  const tickNumerator = TICKS_PER_SECOND * rate.denominator;
  if (tickNumerator % rate.numerator !== 0) return null;
  return tickNumerator / rate.numerator;
}

export function mediaTimeFromSeconds(seconds: number): number | null {
  if (!Number.isFinite(seconds)) return null;
  return Math.round(seconds * TICKS_PER_SECOND);
}

export function mediaTimeToSeconds(ticks: number): number {
  return ticks / TICKS_PER_SECOND;
}

export function mediaTimeToFrameRound(ticks: number, rate: FrameRate): number | null {
  const tpf = ticksPerFrame(rate);
  if (tpf == null || tpf <= 0) return null;
  const floor = Math.floor(ticks / tpf);
  const remainder = ticks % tpf;
  return remainder * 2 >= tpf ? floor + 1 : floor;
}

export function mediaTimeRoundToFrame(ticks: number, rate: FrameRate): number | null {
  const frame = mediaTimeToFrameRound(ticks, rate);
  if (frame == null) return null;
  const tpf = ticksPerFrame(rate);
  if (tpf == null) return null;
  return frame * tpf;
}

export function mediaTimeFloorToFrame(ticks: number, rate: FrameRate): number | null {
  const tpf = ticksPerFrame(rate);
  if (tpf == null || tpf <= 0) return null;
  return Math.floor(ticks / tpf) * tpf;
}

export function mediaTimeIsFrameAligned(ticks: number, rate: FrameRate): boolean {
  const tpf = ticksPerFrame(rate);
  if (tpf == null || tpf <= 0) return false;
  return ticks % tpf === 0;
}

/** Snap seek position to nearest frame, clamped to [0, duration]. */
export function snappedSeekTicks(
  timeTicks: number,
  durationTicks: number,
  rate: FrameRate,
): number {
  const snapped = mediaTimeRoundToFrame(timeTicks, rate) ?? timeTicks;
  return Math.max(0, Math.min(snapped, Math.max(0, durationTicks)));
}

export function snappedSeekSeconds(options: {
  timeSec: number;
  durationSec: number;
  fps?: number;
}): number {
  const rate = frameRateFromNumber(options.fps ?? DEFAULT_TIMELINE_FPS);
  const timeTicks = mediaTimeFromSeconds(Math.max(0, options.timeSec));
  const durationTicks = mediaTimeFromSeconds(Math.max(0, options.durationSec));
  if (timeTicks == null) return Math.max(0, options.timeSec);
  if (durationTicks == null) return mediaTimeToSeconds(timeTicks);
  return mediaTimeToSeconds(snappedSeekTicks(timeTicks, durationTicks, rate));
}

export function roundSecondsToFrame(seconds: number, fps = DEFAULT_TIMELINE_FPS): number {
  const rate = frameRateFromNumber(fps);
  const ticks = mediaTimeFromSeconds(Math.max(0, seconds));
  if (ticks == null) return Math.max(0, seconds);
  const rounded = mediaTimeRoundToFrame(ticks, rate);
  return mediaTimeToSeconds(rounded ?? ticks);
}
