import { parseAss } from '@/features/studio/lib/subtitles/parseAss';
import { parseSrt } from '@/features/studio/lib/subtitles/parseSrt';
import type { ParseSubtitleResult } from '@/features/studio/lib/subtitles/types';

export type { ParseSubtitleResult, SubtitleCue, SubtitleStyleOverrides } from '@/features/studio/lib/subtitles/types';

export function parseSubtitleFile(fileName: string, input: string): ParseSubtitleResult {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  switch (extension) {
    case 'srt':
      return parseSrt(input);
    case 'ass':
    case 'ssa':
      return parseAss(input);
    default:
      throw new Error('Unsupported subtitle format. Use .srt or .ass/.ssa');
  }
}

export async function readSubtitleFile(file: File): Promise<ParseSubtitleResult> {
  const text = await file.text();
  return parseSubtitleFile(file.name, text);
}
