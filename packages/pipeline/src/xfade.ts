/**
 * FFmpeg xfade filter-graph builder for sequential video clips.
 * Consumes TimelineTransition[] from the studio project editor state.
 */

export interface XfadeClipRef {
  id: string;
  durationSec: number;
  startSec?: number;
}

export interface XfadeTransition {
  outgoingClipId: string;
  incomingClipId: string;
  presetId: string;
  durationSec: number;
  /** Resolved FFmpeg xfade transition name (null = hard cut / concat). */
  xfadeName?: string | null;
}

/** Map Vokop transition preset ids → FFmpeg xfade transition names. */
export const PRESET_TO_XFADE: Record<string, string | null> = {
  cut: null,
  dissolve: 'fade',
  fade: 'fadeblack',
  'wipe-left': 'wipeleft',
  'wipe-right': 'wiperight',
  'slide-up': 'slideup',
  'slide-down': 'slidedown',
  'zoom-in': 'zoomin',
  'zoom-out': 'fade',
  blur: 'hblur',
  flash: 'fadewhite',
  spin: 'circleopen',
};

export function resolveXfadeName(presetId: string): string | null {
  if (!presetId || presetId === 'cut') return null;
  return PRESET_TO_XFADE[presetId] ?? null;
}

export function normalizeXfadeTransition(transition: XfadeTransition): XfadeTransition {
  const xfadeName = transition.xfadeName ?? resolveXfadeName(transition.presetId);
  const durationSec = Math.max(0, transition.durationSec);
  return { ...transition, xfadeName, durationSec };
}

/** True when clips are back-to-back on the timeline (within 50ms). */
export function areSequentialClips(
  clips: Array<XfadeClipRef & { startSec: number }>,
  toleranceSec = 0.05,
): boolean {
  if (clips.length < 2) return clips.length === 1;
  const sorted = [...clips].sort((a, b) => a.startSec - b.startSec);
  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = sorted[i]!;
    const next = sorted[i + 1]!;
    const end = cur.startSec + cur.durationSec;
    if (Math.abs(next.startSec - end) > toleranceSec) return false;
  }
  return true;
}

export interface BuildXfadeChainInput {
  /** Prepared ffmpeg stream labels for each clip, in timeline order. */
  clipLabels: string[];
  clipDurations: number[];
  /** Transition between clip[i] and clip[i+1]; length = clipLabels.length - 1 */
  transitions: Array<XfadeTransition | null | undefined>;
}

export interface BuildXfadeChainResult {
  filters: string[];
  outputLabel: string;
  outputDurationSec: number;
}

/**
 * Chain clip streams with xfade (or concat for cuts).
 * Returns filter lines to append to filter_complex.
 */
export function buildXfadeChain(input: BuildXfadeChainInput): BuildXfadeChainResult {
  const { clipLabels, clipDurations, transitions } = input;
  if (clipLabels.length === 0) {
    throw new Error('buildXfadeChain: no clip labels');
  }
  if (clipLabels.length !== clipDurations.length) {
    throw new Error('buildXfadeChain: labels and durations length mismatch');
  }
  if (clipLabels.length === 1) {
    return {
      filters: [],
      outputLabel: clipLabels[0]!,
      outputDurationSec: clipDurations[0]!,
    };
  }

  const filters: string[] = [];
  let cur = clipLabels[0]!;
  let curDuration = clipDurations[0]!;

  for (let i = 0; i < clipLabels.length - 1; i++) {
    const next = clipLabels[i + 1]!;
    const raw = transitions[i];
    const trans = raw ? normalizeXfadeTransition(raw) : null;
    const out = `xf${i}`;

    if (trans && trans.durationSec > 0 && trans.xfadeName) {
      const d = Math.min(trans.durationSec, curDuration * 0.8, clipDurations[i + 1]! * 0.8);
      const offset = Math.max(0, curDuration - d);
      filters.push(
        `[${cur}][${next}]xfade=transition=${trans.xfadeName}:duration=${num(d)}:offset=${num(offset)}[${out}]`,
      );
      curDuration = curDuration + clipDurations[i + 1]! - d;
    } else {
      filters.push(`[${cur}][${next}]concat=n=2:v=1:a=0[${out}]`);
      curDuration = curDuration + clipDurations[i + 1]!;
    }
    cur = out;
  }

  return { filters, outputLabel: cur, outputDurationSec: curDuration };
}

/** Map studio transitions onto adjacent clip index pairs. */
export function transitionsBetweenClips(
  clipIds: string[],
  transitions: XfadeTransition[],
): Array<XfadeTransition | null> {
  const pairs: Array<XfadeTransition | null> = [];
  for (let i = 0; i < clipIds.length - 1; i++) {
    const outgoingId = clipIds[i]!;
    const incomingId = clipIds[i + 1]!;
    const match = transitions.find(
      (t) => t.outgoingClipId === outgoingId && t.incomingClipId === incomingId,
    );
    pairs.push(match ? normalizeXfadeTransition(match) : null);
  }
  return pairs;
}

function num(v: number): string {
  if (Number.isInteger(v)) return String(v);
  return String(Math.round(v * 1_000_000) / 1_000_000);
}
