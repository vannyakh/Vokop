import { useMemo } from 'react';
import { useSegments } from '@/features/translation/hooks/useSegments';
import { useAppStore } from '@/features/project';
import { getSegmentEnd } from '@/features/studio/lib/timelineClipUtils';
import type { TimelineTrackModel } from '@/features/studio/lib/timelineTypes';

export function useTimelineTracks(): TimelineTrackModel[] {
  const duration = useAppStore((s) => s.duration);
  const audioBase64 = useAppStore((s) => s.audioBase64);
  const videoFile = useAppStore((s) => s.videoFile);
  const videoClips = useAppStore((s) => s.videoClips);
  const audioClips = useAppStore((s) => s.audioClips);
  const canvasElements = useAppStore((s) => s.canvasElements);
  const extraTimelineTracks = useAppStore((s) => s.extraTimelineTracks);
  const { transcriptSegments, translationSegments } = useSegments();

  return useMemo(() => {
    const safeDuration = duration || 1;

    const templateClips = canvasElements
      .filter((el) => el.type === 'text' && el.templateId)
      .map((el) => ({
        id: el.id,
        start: el.startTime,
        duration: Math.max(0.4, el.endTime - el.startTime),
        name: el.text,
        canvasKind: 'template' as const,
      }));

    const textClips = [...translationSegments.map((seg, i) => ({
      id: `translation-${i}`,
      start: seg.time,
      duration: getSegmentEnd(translationSegments, i, safeDuration) - seg.time,
      name: seg.text,
      segmentIndex: i,
      segmentType: 'translation' as const,
    })), ...templateClips].sort((a, b) => a.start - b.start);

    const transcriptClips = transcriptSegments.map((seg, i) => ({
      id: `transcript-${i}`,
      start: seg.time,
      duration: getSegmentEnd(transcriptSegments, i, safeDuration) - seg.time,
      name: seg.text,
      segmentIndex: i,
      segmentType: 'transcript' as const,
    }));

    const canvasClips = canvasElements
      .filter((el) => el.type === 'logo' || el.type === 'image')
      .map((el) => ({
        id: el.id,
        start: el.startTime,
        duration: Math.max(0.4, el.endTime - el.startTime),
        name: el.type === 'logo' ? `Logo · ${el.text}` : el.text,
        canvasKind: el.type as 'logo' | 'image',
        trackId: el.trackId ?? 'overlay',
      }));

    const overlayTextClips = canvasElements
      .filter((el) => el.type === 'text' && !el.templateId && !el.segmentType && el.trackId)
      .map((el) => ({
        id: el.id,
        start: el.startTime,
        duration: Math.max(0.4, el.endTime - el.startTime),
        name: el.text,
        canvasKind: 'template' as const,
        trackId: el.trackId!,
      }));

    const mainOverlayClips = [
      ...transcriptClips,
      ...canvasClips.filter((c) => c.trackId === 'overlay'),
      ...overlayTextClips.filter((c) => c.trackId === 'overlay'),
    ].sort((a, b) => a.start - b.start);

    const tracks: TimelineTrackModel[] = [
      {
        id: 'video',
        type: 'video',
        label: 'Video',
        clips: videoClips.map((clip) => ({
          id: clip.id,
          start: clip.start,
          duration: clip.duration,
          name: clip.name,
          mediaKind: 'video' as const,
          sourceStart: clip.sourceStart,
        })),
      },
      {
        id: 'text',
        type: 'text',
        label: 'Text',
        clips: textClips,
      },
      {
        id: 'overlay',
        type: 'overlay',
        label: 'Overlay',
        clips: mainOverlayClips,
      },
    ];

    for (const extra of extraTimelineTracks) {
      const clips = [
        ...canvasClips.filter((c) => c.trackId === extra.id),
        ...overlayTextClips.filter((c) => c.trackId === extra.id),
      ].sort((a, b) => a.start - b.start);
      tracks.push({
        id: extra.id,
        type: 'overlay',
        label: extra.label,
        clips,
        isExtra: true,
      });
    }

    if (audioClips.length > 0 || audioBase64) {
      tracks.push({
        id: 'audio',
        type: 'audio',
        label: 'Voiceover',
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

    return tracks;
  }, [
    duration,
    audioBase64,
    videoFile,
    videoClips,
    audioClips,
    canvasElements,
    extraTimelineTracks,
    transcriptSegments,
    translationSegments,
  ]);
}
