import { useMemo } from 'react';
import { useAppStore } from '@/features/project';
import { buildTimelineTracks } from '@/features/studio/lib/buildTimelineTracks';
import type { TimelineTrackModel } from '@/features/studio/lib/timelineTypes';

export function useTimelineTracks(): TimelineTrackModel[] {
  const duration = useAppStore((s) => s.duration);
  const audioBase64 = useAppStore((s) => s.audioBase64);
  const videoFile = useAppStore((s) => s.videoFile);
  const videoClips = useAppStore((s) => s.videoClips);
  const audioClips = useAppStore((s) => s.audioClips);
  const canvasElements = useAppStore((s) => s.canvasElements);
  const extraTimelineTracks = useAppStore((s) => s.extraTimelineTracks);
  const timelineTrackOrder = useAppStore((s) => s.timelineTrackOrder);
  const timelineTrackLabels = useAppStore((s) => s.timelineTrackLabels);
  const timelineTrackHidden = useAppStore((s) => s.timelineTrackHidden);
  const transcript = useAppStore((s) => s.transcript);
  const translatedText = useAppStore((s) => s.translatedText);
  const captionTracks = useAppStore((s) => s.captionTracks);

  return useMemo(
    () =>
      buildTimelineTracks({
        duration,
        audioBase64,
        videoFile,
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
      }),
    [
      duration,
      audioBase64,
      videoFile,
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
    ],
  );
}
