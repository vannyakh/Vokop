/** Beat detection result from audio analysis. */
export interface BeatAnalysis {
  /** Estimated tempo (beats per minute). */
  bpm: number;
  /** Beat timestamps in seconds (timeline-relative). */
  beats: number[];
  /** Normalized onset strength per beat (0..1). */
  strengths: number[];
  /** Duration of analyzed audio in seconds. */
  durationSec: number;
  /** Where the analysis came from. */
  source: 'video' | 'audio' | 'timeline';
}

/** Suggested razor cut aligned to a detected beat. */
export interface AutoCutSuggestion {
  timeSec: number;
  /** Onset strength 0..1 — higher = stronger beat. */
  strength: number;
}

export interface BeatDetectionOptions {
  minBpm?: number;
  maxBpm?: number;
  /** 0 = fewer beats, 1 = more beats. Default 0.5. */
  sensitivity?: number;
}

export type AutoCutDensity = 'every-beat' | 'every-2' | 'every-4';

export interface AutoCutOptions {
  /** Minimum resulting clip length (seconds). */
  minClipSec?: number;
  density?: AutoCutDensity;
  /** Only suggest cuts inside these clip ranges. */
  clipRanges?: { startSec: number; endSec: number }[];
}
