import {
  areAdjacentClips,
  sortVideoClips,
} from '@/features/studio/lib/timelineTransitions';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';
import type { TimelineTransition } from '@vokop/shared';

export interface ActiveExportTransition {
  transition: TimelineTransition;
  outgoing: MediaClip;
  incoming: MediaClip;
  /** Timeline time where incoming clip starts (cut point). */
  cutPoint: number;
  /** Effective crossfade duration (matches server xfade clamp). */
  durationSec: number;
  windowStart: number;
  /** 0 = outgoing only, 1 = incoming only. */
  progress: number;
}

export function clipSourceTimeAtTimeline(clip: MediaClip, timelineTime: number): number {
  const offset = Math.min(Math.max(0, timelineTime - clip.start), clip.duration);
  return clip.sourceStart + offset;
}

/** Crossfade window between adjacent clips (FFmpeg xfade offset model). */
export function findActiveExportTransition(
  transitions: TimelineTransition[],
  clips: MediaClip[],
  timelineTime: number,
): ActiveExportTransition | null {
  if (transitions.length === 0 || clips.length < 2) return null;

  const sorted = sortVideoClips(clips);

  for (const transition of transitions) {
    if (!transition.presetId || transition.presetId === 'cut') continue;

    const outgoing = sorted.find((clip) => clip.id === transition.outgoingClipId);
    const incoming = sorted.find((clip) => clip.id === transition.incomingClipId);
    if (!outgoing || !incoming || !areAdjacentClips(outgoing, incoming)) continue;

    const cutPoint = incoming.start;
    const durationSec = Math.min(
      transition.durationSec,
      outgoing.duration * 0.8,
      incoming.duration * 0.8,
    );
    if (durationSec <= 0) continue;

    const windowStart = cutPoint - durationSec;
    if (timelineTime < windowStart - 1e-4 || timelineTime > cutPoint + 1e-4) continue;

    const progress = Math.min(1, Math.max(0, (timelineTime - windowStart) / durationSec));
    return {
      transition,
      outgoing,
      incoming,
      cutPoint,
      durationSec,
      windowStart,
      progress,
    };
  }

  return null;
}
