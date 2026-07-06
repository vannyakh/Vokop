import { useCallback, useRef, useState } from 'react';
import { useAppStore } from '@/features/project';
import { importSubtitleCuesToCaptionSegments } from '@/features/studio/lib/captionChunking';
import { readSubtitleFile } from '@/features/studio/lib/subtitles';
import { captionSegmentsToTranscript } from '@vokop/shared';

export function useSubtitleImport() {
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const importSubtitleFile = useCallback(async (file: File, track: 'transcript' | 'translation') => {
    setError(null);
    setWarnings([]);
    try {
      const parsed = await readSubtitleFile(file);
      const segments = importSubtitleCuesToCaptionSegments(parsed.captions);
      if (segments.length === 0) {
        throw new Error('No subtitle cues found in file.');
      }

      const store = useAppStore.getState();
      store.setCaptionTracks(track, segments);
      if (track === 'transcript') {
        store.setTranscript(captionSegmentsToTranscript(segments));
      } else {
        store.setTranslatedText(captionSegmentsToTranscript(segments));
      }

      const nextWarnings = [...parsed.warnings];
      if (parsed.skippedCueCount > 0) {
        nextWarnings.push(`Skipped ${parsed.skippedCueCount} invalid cue(s).`);
      }
      setWarnings(nextWarnings);
      return segments;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Subtitle import failed';
      setError(message);
      throw err;
    }
  }, []);

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return {
    inputRef,
    importSubtitleFile,
    openFilePicker,
    error,
    warnings,
    clearMessages: () => {
      setError(null);
      setWarnings([]);
    },
  };
}
