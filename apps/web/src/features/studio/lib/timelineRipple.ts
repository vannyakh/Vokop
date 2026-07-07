/**
 * Ripple trim — shift subsequent clips on a track when a clip edge moves.
 * Adapted from OpenCut-style timeline editing (trim ripple).
 */

import type { CaptionSegment, CanvasElement } from '@vokop/shared';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';
import {
  isAudioLikeTimelineTrack,
  isTextTimelineTrack,
  isVideoTimelineTrack,
} from '@/features/studio/lib/timelineTrackUtils';
import { captionSegmentsToTranscript } from '@vokop/shared';

const TIME_EPS = 1e-4;

export function computeRippleTrimDelta(
  origStart: number,
  origDuration: number,
  newStart: number,
  newDuration: number,
): { pivotSec: number; deltaSec: number } | null {
  const origEnd = origStart + origDuration;
  const newEnd = newStart + newDuration;
  const deltaSec = newEnd - origEnd;
  if (Math.abs(deltaSec) < TIME_EPS) return null;
  return { pivotSec: origEnd, deltaSec };
}

function clipOnTrack(
  trackId: string,
  clipTrackId: string | undefined,
  kind: 'video' | 'audio' | 'canvas',
): boolean {
  if (kind === 'video') {
    const resolved = clipTrackId ?? 'video';
    return resolved === trackId || (trackId === 'video' && resolved === 'video');
  }
  if (kind === 'audio') {
    const resolved = clipTrackId ?? 'audio';
    return resolved === trackId;
  }
  if (isTextTimelineTrack(trackId)) {
    return (clipTrackId ?? 'text') === trackId;
  }
  return (clipTrackId ?? trackId) === trackId;
}

function shiftCaptionSegments(
  segments: CaptionSegment[],
  segmentPrefix: 'transcript' | 'translation',
  pivotSec: number,
  deltaSec: number,
  excludeClipId?: string,
): CaptionSegment[] {
  return segments.map((segment, index) => {
    const clipId = `${segmentPrefix}-${index}`;
    if (excludeClipId === clipId) return segment;
    if (segment.startSec + TIME_EPS < pivotSec) return segment;
    return {
      ...segment,
      startSec: Math.max(0, segment.startSec + deltaSec),
      endSec: Math.max(0, segment.endSec + deltaSec),
      words: segment.words?.map((w) => ({
        ...w,
        startSec: Math.max(0, w.startSec + deltaSec),
        endSec: Math.max(0, w.endSec + deltaSec),
      })),
    };
  });
}

export interface RippleShiftInput {
  trackId: string;
  pivotSec: number;
  deltaSec: number;
  excludeClipId: string;
  videoClips: MediaClip[];
  audioClips: MediaClip[];
  canvasElements: CanvasElement[];
  captionTracks: { transcript: CaptionSegment[]; translation: CaptionSegment[] };
}

export interface RippleShiftResult {
  videoClips: MediaClip[];
  audioClips: MediaClip[];
  canvasElements: CanvasElement[];
  captionTracks: { transcript: CaptionSegment[]; translation: CaptionSegment[] };
  transcript: string;
  translatedText: string;
}

/** Shift clips on one track that start at or after `pivotSec` (edited clip excluded). */
export function applyRippleShiftOnTrack(input: RippleShiftInput): RippleShiftResult {
  const { trackId, pivotSec, deltaSec, excludeClipId } = input;
  if (Math.abs(deltaSec) < TIME_EPS) {
    return {
      videoClips: input.videoClips,
      audioClips: input.audioClips,
      canvasElements: input.canvasElements,
      captionTracks: input.captionTracks,
      transcript: captionSegmentsToTranscript(input.captionTracks.transcript),
      translatedText: captionSegmentsToTranscript(input.captionTracks.translation),
    };
  }

  const shouldShift = (start: number, clipId: string, onTrack: boolean) =>
    onTrack && clipId !== excludeClipId && start + TIME_EPS >= pivotSec;

  const videoClips = isVideoTimelineTrack(trackId)
    ? input.videoClips.map((clip) => {
        const onTrack = clipOnTrack(trackId, clip.trackId, 'video');
        if (!shouldShift(clip.start, clip.id, onTrack)) return clip;
        return { ...clip, start: Math.max(0, clip.start + deltaSec) };
      })
    : input.videoClips;

  const audioClips = isAudioLikeTimelineTrack(trackId)
    ? input.audioClips.map((clip) => {
        const onTrack = clipOnTrack(trackId, clip.trackId, 'audio');
        if (!shouldShift(clip.start, clip.id, onTrack)) return clip;
        return { ...clip, start: Math.max(0, clip.start + deltaSec) };
      })
    : input.audioClips;

  const canvasElements = input.canvasElements.map((el) => {
    const onTrack = clipOnTrack(trackId, el.trackId, 'canvas');
    if (!shouldShift(el.startTime, el.id, onTrack)) return el;
    const duration = Math.max(0.4, el.endTime - el.startTime);
    const startTime = Math.max(0, el.startTime + deltaSec);
    return { ...el, startTime, endTime: startTime + duration };
  });

  let captionTracks = input.captionTracks;
  if (isTextTimelineTrack(trackId)) {
    const transcript = shiftCaptionSegments(
      input.captionTracks.transcript,
      'transcript',
      pivotSec,
      deltaSec,
      excludeClipId,
    );
    const translation = shiftCaptionSegments(
      input.captionTracks.translation,
      'translation',
      pivotSec,
      deltaSec,
      excludeClipId,
    );
    captionTracks = { transcript, translation };
  }

  return {
    videoClips,
    audioClips,
    canvasElements,
    captionTracks,
    transcript: captionSegmentsToTranscript(captionTracks.transcript),
    translatedText: captionSegmentsToTranscript(captionTracks.translation),
  };
}
