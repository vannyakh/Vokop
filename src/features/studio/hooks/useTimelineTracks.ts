import { useMemo } from 'react';
import { useSegments } from '@/features/translation/hooks/useSegments';
import { useAppStore } from '@/features/project';
import { getSegmentEnd } from '@/features/studio/lib/timelineClipUtils';
import type { TimelineTrackModel } from '@/features/studio/lib/timelineTypes';

export function useTimelineTracks(): TimelineTrackModel[] {
  const duration = useAppStore((s) => s.duration);
  const audioBase64 = useAppStore((s) => s.audioBase64);
  const videoFile = useAppStore((s) => s.videoFile);
  const canvasElements = useAppStore((s) => s.canvasElements);
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
      }));

    const overlayClips = [...transcriptClips, ...canvasClips].sort((a, b) => a.start - b.start);

    const tracks: TimelineTrackModel[] = [
      {
        id: 'video',
        type: 'video',
        label: 'Video',
        clips: videoFile
          ? [{ id: 'video-main', start: 0, duration: safeDuration, name: videoFile.name }]
          : [],
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
        clips: overlayClips,
      },
    ];

    if (audioBase64) {
      tracks.push({
        id: 'audio',
        type: 'audio',
        label: 'Voiceover',
        clips: [{ id: 'audio-main', start: 0, duration: safeDuration, name: 'Generated voice' }],
      });
    }

    return tracks;
  }, [duration, audioBase64, videoFile, canvasElements, transcriptSegments, translationSegments]);
}
