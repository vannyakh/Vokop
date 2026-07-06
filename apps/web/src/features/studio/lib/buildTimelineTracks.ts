import { captionSegmentsToLegacySegments } from '@vokop/shared';
import { getSegmentEnd } from '@/features/studio/lib/timelineClipUtils';
import type { ExtraTimelineTrack, MediaClip, TimelineTrackModel } from '@/features/studio/lib/timelineTypes';
import { TRACK_TYPE_LABELS } from '@/features/studio/lib/timelineTypes';
import { orderTimelineTracks, footageTrackHasClips } from '@/features/studio/lib/timelineTrackUtils';
import type { CanvasElement } from '@/types/canvas';
import type { Segment } from '@/types';
import { parseSegments } from '@/lib/utils/transcript';

export interface BuildTimelineTracksInput {
  duration: number;
  audioBase64: string | null;
  videoFile: File | null;
  videoClips: MediaClip[];
  audioClips: MediaClip[];
  canvasElements: CanvasElement[];
  extraTimelineTracks: ExtraTimelineTrack[];
  timelineTrackOrder: string[];
  timelineTrackLabels: Record<string, string>;
  timelineTrackHidden: string[];
  transcript: string;
  translatedText: string;
  captionTracks: {
    transcript: import('@vokop/shared').CaptionSegment[];
    translation: import('@vokop/shared').CaptionSegment[];
  };
}

function resolveSegments(
  captionSegments: import('@vokop/shared').CaptionSegment[],
  legacyText: string,
): Segment[] {
  if (captionSegments.length > 0) {
    return captionSegmentsToLegacySegments(captionSegments);
  }
  return parseSegments(legacyText);
}

export function buildTimelineTracks(input: BuildTimelineTracksInput): TimelineTrackModel[] {
  const {
    duration,
    audioBase64,
    videoClips,
    audioClips,
    canvasElements,
    extraTimelineTracks,
    timelineTrackOrder,
    timelineTrackLabels,
    timelineTrackHidden,
    transcript,
    translatedText,
    captionTracks,
  } = input;

  const safeDuration = duration || 1;
  const labelOf = (id: string, fallback: string) => timelineTrackLabels[id]?.trim() || fallback;

  const transcriptSegments = resolveSegments(captionTracks.transcript, transcript);
  const translationSegments = resolveSegments(captionTracks.translation, translatedText);

  const textClips = [
    ...translationSegments.map((seg, i) => ({
      id: `translation-${i}`,
      start: seg.time,
      duration: getSegmentEnd(translationSegments, i, safeDuration) - seg.time,
      name: seg.text,
      segmentIndex: i,
      segmentType: 'translation' as const,
    })),
    ...transcriptSegments.map((seg, i) => ({
      id: `transcript-${i}`,
      start: seg.time,
      duration: getSegmentEnd(transcriptSegments, i, safeDuration) - seg.time,
      name: seg.text,
      segmentIndex: i,
      segmentType: 'transcript' as const,
    })),
    ...canvasElements
      .filter((el) => el.type === 'text' && el.templateId && !el.trackId)
      .map((el) => ({
        id: el.id,
        start: el.startTime,
        duration: Math.max(0.4, el.endTime - el.startTime),
        name: el.text,
        canvasKind: 'template' as const,
        keyframes: (el.keyframes ?? []).map((k) => ({ id: k.id, offset: k.offset })),
      })),
  ].sort((a, b) => a.start - b.start);

  const canvasVisual = canvasElements
    .filter((el) => el.type === 'logo' || el.type === 'image')
    .map((el) => {
      const isSticker =
        el.trackId === 'sticker' ||
        String(el.trackId ?? '').startsWith('sticker-') ||
        el.text.toLowerCase().includes('sticker');
      return {
        id: el.id,
        start: el.startTime,
        duration: Math.max(0.4, el.endTime - el.startTime),
        name: el.type === 'logo' ? `Logo · ${el.text}` : el.text,
        canvasKind: (isSticker ? 'sticker' : el.type === 'logo' ? 'logo' : 'image') as
          | 'logo'
          | 'image'
          | 'sticker',
        trackId: el.trackId ?? (isSticker ? 'sticker' : 'image'),
        keyframes: (el.keyframes ?? []).map((k) => ({ id: k.id, offset: k.offset })),
      };
    });

  const trackedTextClips = canvasElements
    .filter((el) => el.type === 'text' && el.trackId)
    .map((el) => ({
      id: el.id,
      start: el.startTime,
      duration: Math.max(0.4, el.endTime - el.startTime),
      name: el.text,
      canvasKind: 'template' as const,
      trackId: el.trackId!,
      keyframes: (el.keyframes ?? []).map((k) => ({ id: k.id, offset: k.offset })),
    }));

  const clipsForVisualTrack = (trackId: string, kinds: Array<'logo' | 'image' | 'sticker'>) =>
    canvasVisual
      .filter((c) => {
        if (!kinds.includes(c.canvasKind)) return false;
        if (c.trackId === trackId) return true;
        if (
          trackId === 'image' &&
          (c.trackId === 'overlay' || String(c.trackId).startsWith('overlay-'))
        ) {
          return c.canvasKind === 'logo' || c.canvasKind === 'image';
        }
        return false;
      })
      .sort((a, b) => a.start - b.start);

  const tracks: TimelineTrackModel[] = [
    {
      id: 'video',
      type: 'video',
      label: labelOf('video', TRACK_TYPE_LABELS.video),
      locked: false,
      clips: videoClips
        .filter((clip) => !clip.trackId || clip.trackId === 'video')
        .map((clip) => ({
          id: clip.id,
          start: clip.start,
          duration: clip.duration,
          name: clip.name,
          mediaKind: 'video' as const,
          sourceStart: clip.sourceStart,
        })),
    },
  ];

  for (const extra of extraTimelineTracks.filter((t) => t.type === 'video')) {
    tracks.push({
      id: extra.id,
      type: 'video',
      label: extra.label,
      isExtra: true,
      clips: videoClips
        .filter((clip) => clip.trackId === extra.id)
        .map((clip) => ({
          id: clip.id,
          start: clip.start,
          duration: clip.duration,
          name: clip.name,
          mediaKind: 'video' as const,
          sourceStart: clip.sourceStart,
        })),
    });
  }

  tracks.push(
    {
      id: 'text',
      type: 'text',
      label: labelOf('text', TRACK_TYPE_LABELS.text),
      locked: false,
      clips: [...textClips, ...trackedTextClips.filter((c) => c.trackId === 'text')].sort(
        (a, b) => a.start - b.start,
      ),
    },
    {
      id: 'image',
      type: 'image',
      label: labelOf('image', TRACK_TYPE_LABELS.image),
      locked: false,
      clips: clipsForVisualTrack('image', ['logo', 'image']),
    },
    {
      id: 'sticker',
      type: 'sticker',
      label: labelOf('sticker', TRACK_TYPE_LABELS.sticker),
      locked: false,
      clips: clipsForVisualTrack('sticker', ['sticker']),
    },
    {
      id: 'effect',
      type: 'effect',
      label: labelOf('effect', TRACK_TYPE_LABELS.effect),
      locked: false,
      clips: [],
    },
    {
      id: 'sound',
      type: 'sound',
      label: labelOf('sound', TRACK_TYPE_LABELS.sound),
      locked: false,
      clips: [],
    },
  );

  for (const extra of extraTimelineTracks.filter((t) => t.type !== 'video')) {
    let clips: TimelineTrackModel['clips'] = [];
    if (extra.type === 'text') {
      clips = trackedTextClips.filter((c) => c.trackId === extra.id).sort((a, b) => a.start - b.start);
    } else if (extra.type === 'image') {
      clips = clipsForVisualTrack(extra.id, ['logo', 'image']);
    } else if (extra.type === 'sticker') {
      clips = clipsForVisualTrack(extra.id, ['sticker']);
    } else if (extra.type === 'effect') {
      clips = canvasVisual.filter((c) => c.trackId === extra.id).sort((a, b) => a.start - b.start);
    }

    tracks.push({
      id: extra.id,
      type: extra.type,
      label: extra.label,
      clips,
      isExtra: true,
    });
  }

  if (audioClips.length > 0 || audioBase64) {
    tracks.push({
      id: 'audio',
      type: 'audio',
      label: labelOf('audio', TRACK_TYPE_LABELS.audio),
      locked: false,
      clips:
        audioClips.length > 0
          ? audioClips.map((clip) => ({
              id: clip.id,
              start: clip.start,
              duration: clip.duration,
              name: clip.name,
              mediaKind: 'audio' as const,
              sourceStart: clip.sourceStart,
            }))
          : [
              {
                id: 'audio-main',
                start: 0,
                duration: safeDuration,
                name: 'Generated voice',
                mediaKind: 'audio' as const,
                sourceStart: 0,
              },
            ],
    });
  }

  const visible = tracks.filter((t) => {
    if (timelineTrackHidden.includes(String(t.id))) return false;
    if (t.type === 'video' && !footageTrackHasClips(String(t.id), videoClips)) return false;
    return true;
  });
  return orderTimelineTracks(visible, timelineTrackOrder);
}
