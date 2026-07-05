import type { MediaClip } from '@/features/studio/lib/timelineTypes';
import type { TimelineTransition } from '@vokop/shared';

const ADJACENCY_TOLERANCE_SEC = 0.05;

export function sortVideoClips(clips: MediaClip[]): MediaClip[] {
  return [...clips].sort((a, b) => a.start - b.start);
}

/** Find the clip immediately before `clipId` on the timeline. */
export function findOutgoingVideoClip(
  clips: MediaClip[],
  clipId: string,
): MediaClip | null {
  const sorted = sortVideoClips(clips);
  const index = sorted.findIndex((c) => c.id === clipId);
  if (index <= 0) return null;
  return sorted[index - 1] ?? null;
}

/** True when incoming starts where outgoing ends (within tolerance). */
export function areAdjacentClips(outgoing: MediaClip, incoming: MediaClip): boolean {
  const outgoingEnd = outgoing.start + outgoing.duration;
  return Math.abs(incoming.start - outgoingEnd) <= ADJACENCY_TOLERANCE_SEC;
}

export function findAdjacentPairForClip(
  clips: MediaClip[],
  clipId: string,
): { outgoing: MediaClip; incoming: MediaClip } | null {
  const sorted = sortVideoClips(clips);
  const index = sorted.findIndex((c) => c.id === clipId);
  if (index <= 0) return null;
  const outgoing = sorted[index - 1]!;
  const incoming = sorted[index]!;
  if (!areAdjacentClips(outgoing, incoming)) return null;
  return { outgoing, incoming };
}

export function upsertTimelineTransition(
  transitions: TimelineTransition[],
  next: TimelineTransition,
): TimelineTransition[] {
  const index = transitions.findIndex(
    (t) =>
      t.outgoingClipId === next.outgoingClipId &&
      t.incomingClipId === next.incomingClipId,
  );
  if (index === -1) return [...transitions, next];
  const updated = [...transitions];
  updated[index] = next;
  return updated;
}

export function findTransitionForClip(
  transitions: TimelineTransition[],
  clipId: string,
  clips: MediaClip[],
): TimelineTransition | null {
  const pair = findAdjacentPairForClip(clips, clipId);
  if (!pair) return null;
  return (
    transitions.find(
      (t) =>
        t.outgoingClipId === pair.outgoing.id && t.incomingClipId === pair.incoming.id,
    ) ?? null
  );
}

export function transitionsToXfadeInput(
  transitions: TimelineTransition[],
): Array<{
  outgoingClipId: string;
  incomingClipId: string;
  presetId: string;
  durationSec: number;
}> {
  return transitions.map((t) => ({
    outgoingClipId: t.outgoingClipId,
    incomingClipId: t.incomingClipId,
    presetId: t.presetId,
    durationSec: t.durationSec,
  }));
}
