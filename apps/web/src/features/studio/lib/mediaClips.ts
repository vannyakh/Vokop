import { TIMELINE_MIN_CLIP_SEC, type ExtraTimelineTrack, type MediaClip } from '@/features/studio/lib/timelineTypes';
import { clipTrackId } from '@/features/studio/lib/timelineTrackPlacement';

export function createMediaClip(input: {
  name: string;
  duration: number;
  start?: number;
  sourceStart?: number;
  id?: string;
  trackId?: string;
  mediaAssetId?: string;
  muted?: boolean;
  linkedVideoClipId?: string;
}): MediaClip {
  return {
    id: input.id ?? `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: input.name,
    start: input.start ?? 0,
    duration: Math.max(TIMELINE_MIN_CLIP_SEC, input.duration),
    sourceStart: input.sourceStart ?? 0,
    ...(input.trackId ? { trackId: input.trackId } : {}),
    ...(input.mediaAssetId ? { mediaAssetId: input.mediaAssetId } : {}),
    ...(input.muted != null ? { muted: input.muted } : {}),
    ...(input.linkedVideoClipId ? { linkedVideoClipId: input.linkedVideoClipId } : {}),
  };
}

/** Build an audio-track clip from a video clip (extract / detach). */
export function extractAudioClipFromVideo(
  videoClip: MediaClip,
  options?: { namePrefix?: string },
): MediaClip {
  const prefix = options?.namePrefix ?? 'Audio';
  const baseName = videoClip.name.replace(/\.[^.]+$/, '') || videoClip.name;
  return createMediaClip({
    name: `${prefix} · ${baseName}`,
    start: videoClip.start,
    duration: videoClip.duration,
    sourceStart: videoClip.sourceStart,
    linkedVideoClipId: videoClip.id,
  });
}

export function clampMediaClip(
  clip: MediaClip,
  mediaDuration: number,
  timelineDuration: number,
): MediaClip {
  const maxSource = Math.max(0, mediaDuration);
  const sourceStart = Math.max(0, Math.min(clip.sourceStart, maxSource - TIMELINE_MIN_CLIP_SEC));
  const maxDurationFromSource = Math.max(TIMELINE_MIN_CLIP_SEC, maxSource - sourceStart);
  const duration = Math.max(
    TIMELINE_MIN_CLIP_SEC,
    Math.min(clip.duration, maxDurationFromSource, timelineDuration - clip.start),
  );
  const start = Math.max(0, Math.min(clip.start, timelineDuration - duration));
  return { ...clip, start, duration, sourceStart };
}

/** Split a media clip at an absolute timeline time. */
export function splitMediaClipAt(
  clip: MediaClip,
  atTime: number,
): [MediaClip, MediaClip] | null {
  const end = clip.start + clip.duration;
  if (atTime <= clip.start + TIMELINE_MIN_CLIP_SEC || atTime >= end - TIMELINE_MIN_CLIP_SEC) {
    return null;
  }

  const leftDuration = atTime - clip.start;
  const rightDuration = end - atTime;
  const left: MediaClip = {
    ...clip,
    duration: leftDuration,
  };
  const right: MediaClip = {
    ...clip,
    id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    start: atTime,
    duration: rightDuration,
    sourceStart: clip.sourceStart + leftDuration,
  };
  return [left, right];
}

export function clipEnd(clip: MediaClip): number {
  return clip.start + clip.duration;
}

/** Active media clip at an absolute timeline playhead time. */
export function findClipAtTime(clips: MediaClip[], time: number): MediaClip | null {
  for (const clip of clips) {
    const end = clipEnd(clip);
    if (time >= clip.start && time < end) return clip;
  }
  // Allow the exact end of the last-ending clip to resolve to that clip.
  let best: MediaClip | null = null;
  let bestEnd = -1;
  for (const clip of clips) {
    const end = clipEnd(clip);
    if (Math.abs(time - end) < 1e-4 && end >= bestEnd) {
      best = clip;
      bestEnd = end;
    }
  }
  return best;
}

/** Ordered video track ids (bottom → top). */
export function listVideoTrackIds(
  extraTracks: ExtraTimelineTrack[],
  trackOrder: string[],
  hiddenTracks: string[],
): string[] {
  const ids = ['video', ...extraTracks.filter((t) => t.type === 'video').map((t) => t.id)];
  const ordered =
    trackOrder.length > 0 ? trackOrder.filter((id) => ids.includes(id)) : [...ids];
  for (const id of ids) {
    if (!ordered.includes(id)) ordered.push(id);
  }
  return ordered.filter((id) => !hiddenTracks.includes(id));
}

/** Topmost visible video clip at playhead (respects track stack + preview visibility). */
export function findVideoClipForPreview(
  clips: MediaClip[],
  time: number,
  videoTrackIds: string[],
  previewHidden: Record<string, boolean>,
): MediaClip | null {
  for (let i = videoTrackIds.length - 1; i >= 0; i--) {
    const trackId = videoTrackIds[i]!;
    if (previewHidden[trackId]) continue;
    const trackClips = clips.filter((c) => clipTrackId(c, 'video') === trackId);
    const hit = findClipAtTime(trackClips, time);
    if (hit) return hit;
  }
  return null;
}

/** Map timeline playhead → source media time for stacked video tracks. */
export function timelineToVideoSourceTime(
  clips: MediaClip[],
  time: number,
  videoTrackIds: string[],
  previewHidden: Record<string, boolean>,
): { clip: MediaClip; sourceTime: number } | null {
  const clip = findVideoClipForPreview(clips, time, videoTrackIds, previewHidden);
  if (!clip) return null;
  const offset = Math.min(Math.max(0, time - clip.start), clip.duration);
  return { clip, sourceTime: clip.sourceStart + offset };
}

/** Map timeline playhead → source media time, or null when in a gap. */
export function timelineToSourceTime(clips: MediaClip[], time: number): number | null {
  const clip = findClipAtTime(clips, time);
  if (!clip) return null;
  const offset = Math.min(Math.max(0, time - clip.start), clip.duration);
  return clip.sourceStart + offset;
}

export function maxClipEnd(clips: MediaClip[]): number {
  let max = 0;
  for (const clip of clips) max = Math.max(max, clipEnd(clip));
  return max;
}

/** Timeline length: at least media length and farthest clip end. */
export function computeTimelineDuration(
  mediaDuration: number,
  clips: MediaClip[],
  fallback = 0,
): number {
  return Math.max(mediaDuration, maxClipEnd(clips), fallback);
}
