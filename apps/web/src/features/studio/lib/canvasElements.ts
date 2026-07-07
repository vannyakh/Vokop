import { parseSegments } from '@/lib/utils/transcript';
import { getSegmentEnd } from '@/features/studio/lib/timelineClipUtils';
import { captionSegmentsToLegacySegments, type CaptionTracks } from '@vokop/shared';
import type { CanvasElement } from '@/types/canvas';
import type { Segment } from '@/types';

const CAPTION_PAD = 24;
const BOTTOM_INSET = 48;
const DEFAULT_WIDTH = 280;
const DEFAULT_FONT = 22;

function segmentElementId(type: 'translation' | 'transcript', index: number) {
  return `${type}-${index}`;
}

/** Returns x/y/width/fontSize as fractions (0..1) of canvasWidth/canvasHeight. */
function defaultPosition(canvasWidth: number, canvasHeight: number, index: number) {
  const safeW = canvasWidth > 0 ? canvasWidth : 1;
  const safeH = canvasHeight > 0 ? canvasHeight : 1;
  return {
    x: CAPTION_PAD / safeW,
    y: Math.max(CAPTION_PAD, canvasHeight - BOTTOM_INSET - index * 8) / safeH,
    width: Math.min(DEFAULT_WIDTH, canvasWidth - CAPTION_PAD * 2) / safeW,
    fontSize: DEFAULT_FONT / safeH,
    rotation: 0,
  };
}

function segmentsToElements(
  segments: Segment[],
  type: 'translation' | 'transcript',
  elementType: CanvasElement['type'],
  duration: number,
  existing: Map<string, CanvasElement>,
  canvasWidth: number,
  canvasHeight: number,
): CanvasElement[] {
  return segments.map((seg, index) => {
    const id = segmentElementId(type, index);
    const prev = existing.get(id);
    const defaults = defaultPosition(canvasWidth, canvasHeight, index);

    return {
      id,
      type: elementType,
      text: seg.text,
      x: prev?.x ?? defaults.x,
      y: prev?.y ?? defaults.y,
      width: prev?.width ?? defaults.width,
      height: prev?.height ?? defaults.fontSize * 1.6,
      fontSize: prev?.fontSize ?? defaults.fontSize,
      rotation: prev?.rotation ?? 0,
      opacity: prev?.opacity ?? 1,
      segmentIndex: index,
      segmentType: type,
      startTime: seg.time,
      endTime: getSegmentEnd(segments, index, duration),
    };
  });
}

export function mergeSegmentsIntoCanvasElements(
  translatedText: string,
  transcript: string,
  duration: number,
  existing: CanvasElement[],
  canvasSize = { width: 640, height: 360 },
  captionTracks?: CaptionTracks,
): CanvasElement[] {
  const existingMap = new Map(existing.map((el) => [el.id, el]));
  // Structured captions keep fractional-second timing; legacy strings floor to seconds.
  const translationSegments = captionTracks?.translation.length
    ? captionSegmentsToLegacySegments(captionTracks.translation)
    : parseSegments(translatedText);
  const transcriptSegments = captionTracks?.transcript.length
    ? captionSegmentsToLegacySegments(captionTracks.transcript)
    : parseSegments(transcript);
  const safeDuration = duration || 1;

  const translationElements = segmentsToElements(
    translationSegments,
    'translation',
    'text',
    safeDuration,
    existingMap,
    canvasSize.width,
    canvasSize.height,
  );

  const transcriptElements = segmentsToElements(
    transcriptSegments,
    'transcript',
    'overlay',
    safeDuration,
    existingMap,
    canvasSize.width,
    canvasSize.height,
  );

  const custom = existing.filter((el) => !el.segmentType);

  return [...translationElements, ...transcriptElements, ...custom];
}

export function isElementVisible(element: CanvasElement, currentTime: number): boolean {
  return currentTime >= element.startTime && currentTime < element.endTime;
}

export function parseCanvasElementMeta(id: string) {
  const match = id.match(/^(translation|transcript)-(\d+)$/);
  if (!match) return null;
  return { segmentType: match[1] as 'translation' | 'transcript', index: parseInt(match[2], 10) };
}
