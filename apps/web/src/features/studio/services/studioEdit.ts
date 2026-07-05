/**
 * Studio composition editing service.
 * Pure patch helpers + store-facing apply API for media clips, canvas elements,
 * video frame transform, focus/selection, and timeline split.
 */

import { useAppStore } from '@/features/project';
import {
  extractAudioClipFromVideo,
  splitMediaClipAt,
} from '@/features/studio/lib/mediaClips';
import type { MediaClip, TimelineSelectionItem } from '@/features/studio/lib/timelineTypes';
import { buildTimelineSelection } from '@/features/studio/lib/timelineSelection';
import { isTranscriptReady } from '@/features/studio/lib/transcriptReady';
import type { CanvasElement } from '@/types/canvas';
import {
  getSegmentIndexAtTime,
  parseSegments,
  splitSegmentAtTime,
  updateSegmentText,
} from '@/lib/utils/transcript';

export interface StudioEditOptions {
  /** Record undo history (default true). */
  history?: boolean;
}

const MIN_CLIP_SEC = 0.4;
// Composition x/y/width/height/fontSize are fractions of the content rect (0..1).
const MIN_BOX_FRACTION = 0.03;
const MIN_ELEMENT_WIDTH_FRACTION = 0.02;
const MIN_ELEMENT_HEIGHT_FRACTION = 0.015;
const MIN_FONT_SIZE_FRACTION = 0.012;
const MAX_FONT_SIZE_FRACTION = 0.5;

export interface StudioEditSnapshot {
  currentTime: number;
  duration: number;
  transcript: string;
  translatedText: string;
  status: string;
  videoClips: MediaClip[];
  audioClips: MediaClip[];
  canvasElements: CanvasElement[];
  selectedTimelineClip: TimelineSelectionItem | null;
}

export type SplitTargetKind = 'video' | 'audio' | 'canvas' | 'segment';

export interface SplitTarget {
  kind: SplitTargetKind;
  trackId: TimelineSelectionItem['trackId'];
  clipId: string;
}

function playheadInsideMedia(clip: MediaClip, time: number): boolean {
  const end = clip.start + clip.duration;
  return time > clip.start + MIN_CLIP_SEC && time < end - MIN_CLIP_SEC;
}

function playheadInsideCanvas(el: CanvasElement, time: number): boolean {
  return time > el.startTime + MIN_CLIP_SEC && time < el.endTime - MIN_CLIP_SEC;
}

/** Resolve what the razor can cut at the playhead (footage first, then selection, then others). */
export function resolveSplitTargets(state: StudioEditSnapshot): SplitTarget[] {
  const t = state.currentTime;
  if (!state.duration || t <= 0) return [];

  const targets: SplitTarget[] = [];
  const seen = new Set<string>();
  const push = (target: SplitTarget) => {
    const key = `${target.kind}:${target.clipId}`;
    if (seen.has(key)) return;
    seen.add(key);
    targets.push(target);
  };

  const selected = state.selectedTimelineClip;

  // 1) Footage under playhead always (main user expectation).
  for (const clip of state.videoClips) {
    if (playheadInsideMedia(clip, t)) {
      push({ kind: 'video', trackId: 'video', clipId: clip.id });
    }
  }
  for (const clip of state.audioClips) {
    if (playheadInsideMedia(clip, t)) {
      push({ kind: 'audio', trackId: 'audio', clipId: clip.id });
    }
  }

  // 2) Selected clip if playhead is inside it (text / overlay / extra tracks).
  if (selected) {
    if (selected.trackId === 'video') {
      const clip = state.videoClips.find((c) => c.id === selected.clipId);
      if (clip && playheadInsideMedia(clip, t)) {
        push({ kind: 'video', trackId: 'video', clipId: clip.id });
      }
    } else if (selected.trackId === 'audio' || String(selected.trackId).startsWith('audio') || String(selected.trackId).startsWith('sound')) {
      const clip = state.audioClips.find((c) => c.id === selected.clipId);
      if (clip && playheadInsideMedia(clip, t)) {
        push({ kind: 'audio', trackId: selected.trackId, clipId: clip.id });
      }
    } else {
      const el = state.canvasElements.find((c) => c.id === selected.clipId);
      if (el && playheadInsideCanvas(el, t)) {
        push({ kind: 'canvas', trackId: selected.trackId, clipId: el.id });
      }
    }
  }

  // 3) Any other canvas clips under playhead.
  for (const el of state.canvasElements) {
    if (!playheadInsideCanvas(el, t)) continue;
    const item = timelineItemForCanvasElement(el);
    push({ kind: 'canvas', trackId: item.trackId, clipId: el.id });
  }

  // 4) Caption segments only after transcript exists.
  if (isTranscriptReady(state.transcript, state.status)) {
    const type =
      selected?.trackId === 'overlay' ? ('transcript' as const) : ('translation' as const);
    const source = type === 'transcript' ? state.transcript : state.translatedText;
    const segments = parseSegments(source);
    const index =
      selected &&
      (selected.trackId === 'text' || selected.trackId === 'overlay') &&
      /^(translation|transcript)-\d+$/.test(selected.clipId)
        ? parseInt(selected.clipId.split('-')[1] ?? '-1', 10)
        : getSegmentIndexAtTime(segments, t, state.duration);
    if (index >= 0) {
      const segStart = segments[index].time;
      const segEnd =
        index < segments.length - 1 ? segments[index + 1].time : state.duration;
      if (t > segStart + MIN_CLIP_SEC && t < segEnd - MIN_CLIP_SEC) {
        push({
          kind: 'segment',
          trackId: type === 'transcript' ? 'overlay' : 'text',
          clipId: `${type}-${index}`,
        });
      }
    }
  }

  return targets;
}

export function canSplitAtPlayhead(state: StudioEditSnapshot): boolean {
  return resolveSplitTargets(state).length > 0;
}

export interface SplitApplyResult {
  videoClips?: MediaClip[];
  audioClips?: MediaClip[];
  canvasElements?: CanvasElement[];
  transcript?: string;
  translatedText?: string;
  selectedTimelineClip: TimelineSelectionItem | null;
  selectedTimelineClips: TimelineSelectionItem[];
  selectedCanvasElementId: string | null;
}

/** Pure split: cut every eligible clip under the playhead. */
export function applySplitAtPlayhead(state: StudioEditSnapshot): SplitApplyResult | null {
  const targets = resolveSplitTargets(state);
  if (!targets.length) return null;

  const t = state.currentTime;
  let videoClips = state.videoClips;
  let audioClips = state.audioClips;
  let canvasElements = state.canvasElements;
  let transcript = state.transcript;
  let translatedText = state.translatedText;
  let primary: TimelineSelectionItem | null = null;
  let selectedCanvasElementId: string | null = null;
  let changed = false;

  for (const target of targets) {
    if (target.kind === 'video') {
      const clip = videoClips.find((c) => c.id === target.clipId);
      if (!clip) continue;
      const parts = splitMediaClipAt(clip, t);
      if (!parts) continue;
      const [left, right] = parts;
      videoClips = videoClips.flatMap((c) => (c.id === clip.id ? [left, right] : [c]));
      primary = { trackId: 'video', clipId: right.id };
      selectedCanvasElementId = null;
      changed = true;
      continue;
    }

    if (target.kind === 'audio') {
      const clip = audioClips.find((c) => c.id === target.clipId);
      if (!clip) continue;
      const parts = splitMediaClipAt(clip, t);
      if (!parts) continue;
      const [left, right] = parts;
      audioClips = audioClips.flatMap((c) => (c.id === clip.id ? [left, right] : [c]));
      primary = { trackId: target.trackId, clipId: right.id };
      selectedCanvasElementId = null;
      changed = true;
      continue;
    }

    if (target.kind === 'canvas') {
      const element = canvasElements.find((el) => el.id === target.clipId);
      if (!element || !playheadInsideCanvas(element, t)) continue;
      const left = { ...element, endTime: t };
      const right: CanvasElement = {
        ...element,
        id: `${element.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        startTime: t,
      };
      canvasElements = canvasElements.flatMap((el) =>
        el.id === element.id ? [left, right] : [el],
      );
      primary = { trackId: target.trackId, clipId: right.id };
      selectedCanvasElementId = right.id;
      changed = true;
      continue;
    }

    if (target.kind === 'segment') {
      const type = target.clipId.startsWith('transcript')
        ? ('transcript' as const)
        : ('translation' as const);
      const source = type === 'transcript' ? transcript : translatedText;
      const segments = parseSegments(source);
      const next = splitSegmentAtTime(segments, t, state.duration);
      if (!next) continue;
      if (type === 'transcript') transcript = next;
      else translatedText = next;
      primary = target;
      selectedCanvasElementId = null;
      changed = true;
    }
  }

  if (!changed) return null;

  const selection = buildTimelineSelection(primary ? [primary] : [], primary);
  return {
    videoClips: videoClips !== state.videoClips ? videoClips : undefined,
    audioClips: audioClips !== state.audioClips ? audioClips : undefined,
    canvasElements: canvasElements !== state.canvasElements ? canvasElements : undefined,
    transcript: transcript !== state.transcript ? transcript : undefined,
    translatedText: translatedText !== state.translatedText ? translatedText : undefined,
    ...selection,
    selectedCanvasElementId,
  };
}

/** Split video (+ linked audio) at multiple timeline times — for auto-cut to beats. */
export function applyMediaSplitsAtTimes(
  state: StudioEditSnapshot,
  times: number[],
): SplitApplyResult | null {
  const unique = [...new Set(times.map((t) => Math.round(t * 1000) / 1000))].sort(
    (a, b) => a - b,
  );
  if (!unique.length) return null;

  let videoClips = state.videoClips;
  let audioClips = state.audioClips;
  let changed = false;

  for (const t of unique) {
    let splitVideo = false;

    for (const clip of videoClips) {
      if (!playheadInsideMedia(clip, t)) continue;
      const parts = splitMediaClipAt(clip, t);
      if (!parts) continue;
      const [left, right] = parts;
      videoClips = videoClips.flatMap((c) => (c.id === clip.id ? [left, right] : [c]));

      const linked = audioClips.find((a) => a.linkedVideoClipId === clip.id);
      if (linked) {
        const audioParts = splitMediaClipAt(linked, t);
        if (audioParts) {
          const [audioLeft, audioRight] = audioParts;
          audioRight.linkedVideoClipId = right.id;
          audioClips = audioClips.flatMap((c) =>
            c.id === linked.id ? [audioLeft, audioRight] : [c],
          );
        }
      }

      splitVideo = true;
      changed = true;
    }

    if (!splitVideo) {
      for (const clip of audioClips) {
        if (clip.linkedVideoClipId) continue;
        if (!playheadInsideMedia(clip, t)) continue;
        const parts = splitMediaClipAt(clip, t);
        if (!parts) continue;
        const [left, right] = parts;
        audioClips = audioClips.flatMap((c) => (c.id === clip.id ? [left, right] : [c]));
        changed = true;
      }
    }
  }

  if (!changed) return null;

  const selection = buildTimelineSelection([], null);
  return {
    videoClips: videoClips !== state.videoClips ? videoClips : undefined,
    audioClips: audioClips !== state.audioClips ? audioClips : undefined,
    ...selection,
    selectedCanvasElementId: null,
  };
}

/** Normalize media / composition fields before writing to the store. */
export function normalizeMediaClipPatch(patch: Partial<MediaClip>): Partial<MediaClip> {
  const next: Partial<MediaClip> = { ...patch };

  if (next.start != null) next.start = Math.max(0, next.start);
  if (next.duration != null) next.duration = Math.max(MIN_CLIP_SEC, next.duration);
  if (next.sourceStart != null) next.sourceStart = Math.max(0, next.sourceStart);
  if (next.width != null) next.width = Math.max(MIN_BOX_FRACTION, next.width);
  if (next.height != null) next.height = Math.max(MIN_BOX_FRACTION, next.height);
  if (next.opacity != null) next.opacity = Math.min(1, Math.max(0, next.opacity));
  if (next.volume != null) next.volume = Math.min(2, Math.max(0, next.volume));
  if (next.pan != null) next.pan = Math.min(1, Math.max(-1, next.pan));
  if (next.fadeInSec != null) next.fadeInSec = Math.max(0, next.fadeInSec);
  if (next.fadeOutSec != null) next.fadeOutSec = Math.max(0, next.fadeOutSec);
  if (next.videoFadeInSec != null) next.videoFadeInSec = Math.max(0, next.videoFadeInSec);
  if (next.videoFadeOutSec != null) next.videoFadeOutSec = Math.max(0, next.videoFadeOutSec);
  if (next.rotation != null) {
    // Keep rotation in a sensible range for inspector inputs.
    let r = next.rotation % 360;
    if (r > 180) r -= 360;
    if (r < -180) r += 360;
    next.rotation = r;
  }
  if (typeof next.name === 'string') next.name = next.name.trim() || next.name;

  return next;
}

/** Normalize canvas transform / style fields. */
export function normalizeCanvasElementPatch(
  patch: Partial<CanvasElement>,
): Partial<CanvasElement> {
  const next: Partial<CanvasElement> = { ...patch };

  if (next.width != null) next.width = Math.max(MIN_ELEMENT_WIDTH_FRACTION, next.width);
  if (next.height != null) next.height = Math.max(MIN_ELEMENT_HEIGHT_FRACTION, next.height);
  if (next.opacity != null) next.opacity = Math.min(1, Math.max(0, next.opacity));
  if (next.fontSize != null) {
    next.fontSize = Math.max(MIN_FONT_SIZE_FRACTION, Math.min(MAX_FONT_SIZE_FRACTION, next.fontSize));
  }

  return next;
}

export type MediaListKey = 'videoClips' | 'audioClips';

/** Apply a media clip patch to video/audio lists (pure). */
export function applyMediaClipToLists(
  videoClips: MediaClip[],
  audioClips: MediaClip[],
  id: string,
  patch: Partial<MediaClip>,
): { listKey: MediaListKey; nextList: MediaClip[] } | null {
  const normalized = normalizeMediaClipPatch(patch);
  if (videoClips.some((c) => c.id === id)) {
    return {
      listKey: 'videoClips',
      nextList: videoClips.map((c) => (c.id === id ? { ...c, ...normalized } : c)),
    };
  }
  if (audioClips.some((c) => c.id === id)) {
    return {
      listKey: 'audioClips',
      nextList: audioClips.map((c) => (c.id === id ? { ...c, ...normalized } : c)),
    };
  }
  return null;
}

export interface CanvasElementPatchResult {
  canvasElements: CanvasElement[];
  transcript?: string;
  translatedText?: string;
}

/** Apply a canvas element patch and optional caption segment text sync (pure). */
export function applyCanvasElementPatch(
  canvasElements: CanvasElement[],
  transcript: string,
  translatedText: string,
  id: string,
  patch: Partial<CanvasElement>,
): CanvasElementPatchResult | null {
  const element = canvasElements.find((el) => el.id === id);
  if (!element) return null;

  const normalized = normalizeCanvasElementPatch(patch);
  const nextElements = canvasElements.map((el) =>
    el.id === id ? { ...el, ...normalized } : el,
  );

  const result: CanvasElementPatchResult = { canvasElements: nextElements };

  if (
    normalized.text !== undefined &&
    element.segmentType !== undefined &&
    element.segmentIndex !== undefined
  ) {
    if (element.segmentType === 'transcript') {
      const segments = parseSegments(transcript);
      result.transcript = updateSegmentText(segments, element.segmentIndex, normalized.text);
    } else {
      const segments = parseSegments(translatedText);
      result.translatedText = updateSegmentText(
        segments,
        element.segmentIndex,
        normalized.text,
      );
    }
  }

  return result;
}

/** Map a canvas element to its timeline selection identity. */
export function timelineItemForCanvasElement(
  element: CanvasElement,
): TimelineSelectionItem {
  if (element.segmentType === 'translation' || element.templateId) {
    return { trackId: 'text', clipId: element.id };
  }
  if (element.segmentType === 'transcript') {
    return { trackId: 'overlay', clipId: element.id };
  }
  if (element.type === 'logo' || element.type === 'image' || element.trackId) {
    return {
      trackId: (element.trackId ?? 'overlay') as TimelineSelectionItem['trackId'],
      clipId: element.id,
    };
  }
  return { trackId: 'text', clipId: element.id };
}

/** Composition transform fields on a media (video) clip. */
export type VideoTransformPatch = Pick<
  MediaClip,
  'x' | 'y' | 'width' | 'height' | 'rotation' | 'opacity'
>;

/**
 * Store-facing edit API. Prefer this from hooks/components so update rules
 * stay in one place; Zustand actions remain the source of truth for state.
 */
export const studioEdit = {
  updateMediaClip(
    id: string,
    patch: Partial<MediaClip>,
    options?: StudioEditOptions,
  ): void {
    useAppStore.getState().updateMediaClip(id, normalizeMediaClipPatch(patch), options);
  },

  updateCanvasElement(
    id: string,
    patch: Partial<CanvasElement>,
    options?: StudioEditOptions,
  ): void {
    useAppStore
      .getState()
      .updateCanvasElement(id, normalizeCanvasElementPatch(patch), options);
  },

  /** Update video frame position / size / rotation in the composition. */
  updateVideoTransform(
    clipId: string,
    transform: VideoTransformPatch,
    options?: StudioEditOptions,
  ): void {
    studioEdit.updateMediaClip(clipId, transform, options);
  },

  /** Update canvas-backed clip timing on the timeline. */
  updateCanvasTiming(
    clipId: string,
    timing: { startTime: number; endTime: number },
    options?: StudioEditOptions,
  ): void {
    studioEdit.updateCanvasElement(clipId, timing, options);
  },

  focusVideoClip(clipId: string, options?: { openInspector?: boolean }): void {
    const store = useAppStore.getState();
    if (store.isTimelinePlaying) store.setTimelinePlaying(false);
    store.selectTimelineClip(
      { trackId: 'video', clipId },
      {
        mode: 'replace',
        syncCanvas: true,
        openInspector: options?.openInspector ?? true,
      },
    );
  },

  focusCanvasElement(id: string): void {
    const store = useAppStore.getState();
    if (store.isTimelinePlaying) store.setTimelinePlaying(false);
    store.selectCanvasElement(id);
  },

  clearFocus(): void {
    useAppStore.getState().clearTimelineSelection({ clearCanvas: true });
  },

  commitHistory(): void {
    useAppStore.getState().commitProjectHistory();
  },

  /** Whether the razor can cut anything under the playhead. */
  canSplitAtPlayhead(): boolean {
    const s = useAppStore.getState();
    return canSplitAtPlayhead({
      currentTime: s.currentTime,
      duration: s.duration,
      transcript: s.transcript,
      translatedText: s.translatedText,
      status: s.status,
      videoClips: s.videoClips,
      audioClips: s.audioClips,
      canvasElements: s.canvasElements,
      selectedTimelineClip: s.selectedTimelineClip,
    });
  },

  /** Split footage / clips under the playhead (no transcript required for media). */
  splitAtPlayhead(): boolean {
    useAppStore.getState().splitTimelineAtPlayhead();
    return true;
  },

  /**
   * Copy video clip audio onto the audio track (video keeps sound).
   * Returns the new audio clip id, or null if nothing to extract.
   */
  extractAudioFromVideo(clipId?: string): string | null {
    return useAppStore.getState().extractAudioFromVideoClip(clipId);
  },

  /**
   * Split audio away from video: extract to audio track and mute the video clip.
   */
  detachAudioFromVideo(clipId?: string): string | null {
    return useAppStore.getState().detachAudioFromVideoClip(clipId);
  },

  /**
   * Copy every clip's audio on a video track onto the audio track (video keeps sound).
   * Returns the extracted/linked audio clip ids.
   */
  extractAudioFromVideoTrack(trackId?: string): string[] {
    return useAppStore.getState().extractAudioFromVideoTrack(trackId);
  },

  /**
   * Split audio away from an entire video track: extract every clip's audio to
   * the audio track and mute every clip on that video track.
   */
  detachAudioFromVideoTrack(trackId?: string): string[] {
    return useAppStore.getState().detachAudioFromVideoTrack(trackId);
  },
};
