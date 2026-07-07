import { useCallback, useRef, useState } from 'react';
import { importSubtitlesToProject } from '@/features/studio/lib/subtitles/importSubtitlesToProject';

export function useSubtitleImport() {
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const importSubtitleFile = useCallback(async (file: File, track: 'transcript' | 'translation') => {
    setError(null);
    setWarnings([]);
    try {
      const result = await importSubtitlesToProject({ file, track });
      setWarnings(result.warnings);
      return result.segments;
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
