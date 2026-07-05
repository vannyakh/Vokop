import type {
  AutoCutDensity,
  AutoCutOptions,
  AutoCutSuggestion,
  BeatAnalysis,
  BeatDetectionOptions,
} from '../types/beatAnalysis.js';

const DEFAULT_MIN_BPM = 60;
const DEFAULT_MAX_BPM = 180;

/** Bucket PCM samples into normalized peaks (0..1), matching pipeline waveform style. */
export function samplesToPeaks(samples: ArrayLike<number>, peakCount: number): number[] {
  const count = Math.max(16, peakCount);
  const total = samples.length;
  if (total === 0) return new Array<number>(count).fill(0);

  const bucketSize = Math.max(1, Math.floor(total / count));
  const peaks: number[] = [];
  for (let b = 0; b < count; b++) {
    const start = b * bucketSize;
    if (start >= total) {
      peaks.push(0);
      continue;
    }
    const end = Math.min(total, start + bucketSize);
    let max = 0;
    for (let i = start; i < end; i++) {
      max = Math.max(max, Math.abs(samples[i]!));
    }
    peaks.push(Math.round(max * 1000) / 1000);
  }
  return peaks;
}

/** Onset strength via positive spectral-flux approximation on peaks. */
export function computeOnsetStrength(peaks: number[]): number[] {
  const strength: number[] = [0];
  for (let i = 1; i < peaks.length; i++) {
    strength.push(Math.max(0, peaks[i]! - peaks[i - 1]!));
  }
  return strength;
}

function findPeakIndices(
  strength: number[],
  minDistance: number,
  threshold: number,
): number[] {
  const indices: number[] = [];
  for (let i = 1; i < strength.length - 1; i++) {
    const value = strength[i]!;
    if (value < threshold || value < strength[i - 1]! || value < strength[i + 1]!) continue;

    const last = indices[indices.length - 1];
    if (last !== undefined && i - last < minDistance) {
      if (value > strength[last]!) indices[indices.length - 1] = i;
    } else {
      indices.push(i);
    }
  }
  return indices;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

function estimateBpmFromBeats(
  beats: number[],
  minBpm: number,
  maxBpm: number,
): number {
  const intervals: number[] = [];
  for (let i = 1; i < beats.length; i++) {
    intervals.push(beats[i]! - beats[i - 1]!);
  }
  const valid = intervals.filter((iv) => {
    const bpm = 60 / iv;
    return bpm >= minBpm && bpm <= maxBpm;
  });
  const pool = valid.length ? valid : intervals;
  if (!pool.length) return 120;
  return Math.round(60 / median(pool));
}

/** Detect beat timestamps from normalized waveform peaks. */
export function detectBeatsFromPeaks(
  peaks: number[],
  durationSec: number,
  options: BeatDetectionOptions = {},
): BeatAnalysis {
  const minBpm = options.minBpm ?? DEFAULT_MIN_BPM;
  const maxBpm = options.maxBpm ?? DEFAULT_MAX_BPM;
  const sensitivity = Math.min(1, Math.max(0, options.sensitivity ?? 0.5));

  if (peaks.length < 4 || durationSec <= 0) {
    return { bpm: 120, beats: [], strengths: [], durationSec, source: 'timeline' };
  }

  const strength = computeOnsetStrength(peaks);
  const mean = strength.reduce((sum, v) => sum + v, 0) / strength.length;
  const threshold = mean * (0.35 + sensitivity * 0.85);

  const minIntervalSec = 60 / maxBpm;
  const minDistance = Math.max(
    1,
    Math.floor((minIntervalSec / durationSec) * peaks.length),
  );

  const peakIndices = findPeakIndices(strength, minDistance, threshold);
  const beats = peakIndices.map((i) => (i / peaks.length) * durationSec);
  const strengths = peakIndices.map((i) => {
    const max = Math.max(...strength);
    return max > 0 ? strength[i]! / max : 0;
  });

  const bpm = estimateBpmFromBeats(beats, minBpm, maxBpm);

  return {
    bpm,
    beats,
    strengths,
    durationSec,
    source: 'timeline',
  };
}

function insideClipRanges(timeSec: number, ranges: { startSec: number; endSec: number }[]): boolean {
  return ranges.some((r) => timeSec > r.startSec && timeSec < r.endSec);
}

function densityStep(density: AutoCutDensity): number {
  if (density === 'every-2') return 2;
  if (density === 'every-4') return 4;
  return 1;
}

/** Build razor-cut suggestions from detected beats. */
export function suggestAutoCuts(
  analysis: Pick<BeatAnalysis, 'beats' | 'strengths'>,
  options: AutoCutOptions = {},
): AutoCutSuggestion[] {
  const minClipSec = options.minClipSec ?? 0.4;
  const density = options.density ?? 'every-beat';
  const step = densityStep(density);
  const ranges = options.clipRanges ?? [];

  const suggestions: AutoCutSuggestion[] = [];
  for (let i = 0; i < analysis.beats.length; i += step) {
    const timeSec = analysis.beats[i]!;
    const strength = analysis.strengths[i] ?? 0.5;

    if (ranges.length && !insideClipRanges(timeSec, ranges)) continue;

    if (ranges.length) {
      const range = ranges.find((r) => timeSec > r.startSec && timeSec < r.endSec);
      if (!range) continue;
      if (timeSec - range.startSec < minClipSec || range.endSec - timeSec < minClipSec) continue;
    }

    suggestions.push({ timeSec, strength });
  }
  return suggestions;
}

/** Map timeline clip list to cut-eligible ranges (with margin). */
export function clipRangesForAutoCut(
  clips: { start: number; duration: number }[],
  minClipSec = 0.4,
): { startSec: number; endSec: number }[] {
  return clips.map((clip) => ({
    startSec: clip.start + minClipSec,
    endSec: clip.start + clip.duration - minClipSec,
  }));
}
