import type { ParseSubtitleResult, SubtitleCue } from '@/features/studio/lib/subtitles/types';

const TIMESTAMP_SEPARATOR = /\s*-->\s*/;
const TIMESTAMP_PATTERN =
  /^(\d{2}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{1,3})/;

/** Parse SRT subtitle files (OpenCut sample: `@templates/OpenCut/.../subtitles/srt.ts`). */
export function parseSrt(input: string): ParseSubtitleResult {
  const normalized = input.replace(/\r\n?/g, '\n').trim();
  if (!normalized) {
    return { captions: [], skippedCueCount: 0, warnings: [] };
  }

  const blocks = normalized.split(/\n{2,}/);
  const cues: SubtitleCue[] = [];
  let skippedCueCount = 0;

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      skippedCueCount += 1;
      continue;
    }

    const timestampIndex = TIMESTAMP_SEPARATOR.test(lines[0]!) ? 0 : 1;
    const timestampLine = lines[timestampIndex];
    if (!timestampLine || !TIMESTAMP_PATTERN.test(timestampLine)) {
      skippedCueCount += 1;
      continue;
    }

    const text = lines.slice(timestampIndex + 1).join('\n').trim();
    if (!text) {
      skippedCueCount += 1;
      continue;
    }

    const [rawStart, rawEnd] = timestampLine.split(TIMESTAMP_SEPARATOR);
    if (!rawStart || !rawEnd) {
      skippedCueCount += 1;
      continue;
    }

    const startTime = parseSrtTimestamp(rawStart);
    const endTime = parseSrtTimestamp(rawEnd);
    const duration = endTime - startTime;

    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || duration <= 0) {
      skippedCueCount += 1;
      continue;
    }

    cues.push({ text, startTime, duration });
  }

  return { captions: cues, skippedCueCount, warnings: [] };
}

function parseSrtTimestamp(input: string): number {
  const normalized = input.trim().replace(',', '.');
  const match = normalized.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{1,3})$/);
  if (!match) return Number.NaN;

  const [, hours, minutes, seconds, milliseconds] = match;
  return (
    Number.parseInt(hours!, 10) * 3600 +
    Number.parseInt(minutes!, 10) * 60 +
    Number.parseInt(seconds!, 10) +
    Number.parseInt(milliseconds!.padEnd(3, '0'), 10) / 1000
  );
}
