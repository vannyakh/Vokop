import type { CanvasElement } from '@/types/canvas';
import type { ExtraTimelineTrack, MediaClip } from '@/features/studio/lib/timelineTypes';

const MAX_HISTORY = 50;

export interface ProjectSnapshot {
  canvasElements: CanvasElement[];
  transcript: string;
  translatedText: string;
  videoClips: MediaClip[];
  audioClips: MediaClip[];
  extraTimelineTracks: ExtraTimelineTrack[];
}

export function cloneProjectSnapshot(snapshot: ProjectSnapshot): ProjectSnapshot {
  return structuredClone(snapshot);
}

export function pushProjectHistory(
  stack: ProjectSnapshot[],
  snapshot: ProjectSnapshot,
): ProjectSnapshot[] {
  return [...stack.slice(-(MAX_HISTORY - 1)), cloneProjectSnapshot(snapshot)];
}
