import { useMemo } from 'react';
import { useAppStore } from '@/features/project';
import { parseSegments, getActiveSegmentIndex } from '@/lib/utils/transcript';

export function useSegments() {
  const transcript = useAppStore((s) => s.transcript);
  const translatedText = useAppStore((s) => s.translatedText);
  const currentTime = useAppStore((s) => s.currentTime);

  const transcriptSegments = useMemo(() => parseSegments(transcript), [transcript]);
  const translationSegments = useMemo(() => parseSegments(translatedText), [translatedText]);

  const activeSegmentIndex = useMemo(() => {
    const segments = translationSegments.length > 0 ? translationSegments : transcriptSegments;
    return getActiveSegmentIndex(segments, currentTime);
  }, [currentTime, transcriptSegments, translationSegments]);

  return { transcriptSegments, translationSegments, activeSegmentIndex };
}
