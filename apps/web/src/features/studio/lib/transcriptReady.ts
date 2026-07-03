import { parseSegments } from '@/lib/utils/transcript';

/** Advanced editor (inspector, split, drag) unlocks only after transcript exists. */
export function isTranscriptReady(transcript: string, status: string): boolean {
  if (status === 'transcribing') return false;
  return parseSegments(transcript).length > 0;
}
