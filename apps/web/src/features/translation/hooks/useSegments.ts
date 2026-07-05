import { useMemo } from 'react';
import { useAppStore } from '@/features/project';
import { parseSegments, getActiveSegmentIndex } from '@/lib/utils/transcript';
import { captionSegmentsToLegacySegments, getActiveCaptionSegmentIndex } from '@vokop/shared';

export function useSegments() {
  const transcript = useAppStore((s) => s.transcript);
  const translatedText = useAppStore((s) => s.translatedText);
  const captionTracks = useAppStore((s) => s.captionTracks);
  const currentTime = useAppStore((s) => s.currentTime);

  const transcriptSegments = useMemo(() => {
    if (captionTracks.transcript.length > 0) {
      return captionSegmentsToLegacySegments(captionTracks.transcript);
    }
    return parseSegments(transcript);
  }, [captionTracks.transcript, transcript]);

  const translationSegments = useMemo(() => {
    if (captionTracks.translation.length > 0) {
      return captionSegmentsToLegacySegments(captionTracks.translation);
    }
    return parseSegments(translatedText);
  }, [captionTracks.translation, translatedText]);

  const activeSegmentIndex = useMemo(() => {
    const structured =
      captionTracks.translation.length > 0
        ? captionTracks.translation
        : captionTracks.transcript.length > 0
          ? captionTracks.transcript
          : null;

    if (structured?.length) {
      return getActiveCaptionSegmentIndex(structured, currentTime);
    }

    const segments = translationSegments.length > 0 ? translationSegments : transcriptSegments;
    return getActiveSegmentIndex(segments, currentTime);
  }, [
    currentTime,
    captionTracks.translation,
    captionTracks.transcript,
    transcriptSegments,
    translationSegments,
  ]);

  return {
    transcriptSegments,
    translationSegments,
    activeSegmentIndex,
    captionTracks,
  };
}
