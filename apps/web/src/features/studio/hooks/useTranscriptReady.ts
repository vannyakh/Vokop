import { useMemo } from 'react';
import { useAppStore } from '@/features/project';
import { isTranscriptReady } from '@/features/studio/lib/transcriptReady';

/** Advanced editor (inspector, split, drag) unlocks only after transcript exists. */
export function useTranscriptReady(): boolean {
  const transcript = useAppStore((s) => s.transcript);
  const status = useAppStore((s) => s.status);

  return useMemo(() => isTranscriptReady(transcript, status), [transcript, status]);
}
