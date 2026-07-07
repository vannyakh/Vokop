import type { CaptionSegment, CaptionWord } from '@vokop/shared';
import type { SubtitleCue } from '@/features/studio/lib/subtitles/types';
import { toCaptionSegmentStyle } from '@/features/studio/lib/subtitles/captionSegmentStyle';

export interface ChunkCaptionOptions {
  maxChars?: number;
  maxDurationSec?: number;
}

const DEFAULT_MAX_CHARS = 48;
const DEFAULT_MAX_DURATION_SEC = 5.5;

/** Split long caption segments into shorter readable cues (OpenCut-style chunking). */
export function chunkCaptionSegments(
  segments: CaptionSegment[],
  options: ChunkCaptionOptions = {},
): CaptionSegment[] {
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
  const maxDurationSec = options.maxDurationSec ?? DEFAULT_MAX_DURATION_SEC;
  const out: CaptionSegment[] = [];

  for (const segment of segments) {
    const duration = segment.endSec - segment.startSec;
    const needsSplit =
      segment.text.length > maxChars || duration > maxDurationSec + 0.01;

    if (!needsSplit) {
      out.push(segment);
      continue;
    }

    if (segment.words && segment.words.length > 1) {
      out.push(...chunkSegmentByWords(segment, maxChars, maxDurationSec));
      continue;
    }

    out.push(...chunkSegmentByText(segment, maxChars, maxDurationSec));
  }

  return out;
}

function chunkSegmentByWords(
  segment: CaptionSegment,
  maxChars: number,
  maxDurationSec: number,
): CaptionSegment[] {
  const words = segment.words!;
  const chunks: CaptionSegment[] = [];
  let chunkWords: CaptionWord[] = [];
  let chunkStart = words[0]!.startSec;

  const flush = () => {
    if (chunkWords.length === 0) return;
    chunks.push({
      startSec: chunkStart,
      endSec: chunkWords[chunkWords.length - 1]!.endSec,
      speaker: segment.speaker,
      text: chunkWords.map((w) => w.text).join(' ').trim(),
      words: [...chunkWords],
      ...(segment.style ? { style: segment.style } : {}),
    });
    chunkWords = [];
  };

  for (const word of words) {
    const candidate = [...chunkWords, word];
    const candidateText = candidate.map((w) => w.text).join(' ');
    const candidateDuration = word.endSec - chunkStart;

    if (
      chunkWords.length > 0 &&
      (candidateText.length > maxChars || candidateDuration > maxDurationSec)
    ) {
      flush();
      chunkStart = word.startSec;
      chunkWords = [word];
      continue;
    }

    if (chunkWords.length === 0) chunkStart = word.startSec;
    chunkWords.push(word);
  }

  flush();
  return chunks.length > 0 ? chunks : [segment];
}

function chunkSegmentByText(
  segment: CaptionSegment,
  maxChars: number,
  maxDurationSec: number,
): CaptionSegment[] {
  const tokens = segment.text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) return [segment];

  const duration = segment.endSec - segment.startSec;
  const chunks: CaptionSegment[] = [];
  let line: string[] = [];

  const flush = (index: number, total: number) => {
    if (line.length === 0) return;
    const startRatio = (index - line.length) / total;
    const endRatio = index / total;
    chunks.push({
      startSec: segment.startSec + duration * startRatio,
      endSec: segment.startSec + duration * endRatio,
      speaker: segment.speaker,
      text: line.join(' '),
      ...(segment.style ? { style: segment.style } : {}),
    });
    line = [];
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const next = [...line, tokens[i]!];
    if (line.length > 0 && next.join(' ').length > maxChars) {
      flush(i, tokens.length);
    }
    line.push(tokens[i]!);
  }
  flush(tokens.length, tokens.length);

  if (chunks.length <= 1) return [segment];

  const merged: CaptionSegment[] = [];
  for (const chunk of chunks) {
    const d = chunk.endSec - chunk.startSec;
    if (d > maxDurationSec && chunk.text.includes(' ')) {
      merged.push(...chunkSegmentByText(chunk, maxChars, maxDurationSec));
    } else {
      merged.push(chunk);
    }
  }
  return merged;
}

export function subtitleCuesToCaptionSegments(cues: SubtitleCue[]): CaptionSegment[] {
  return cues.map((cue) => ({
    startSec: cue.startTime,
    endSec: cue.startTime + cue.duration,
    speaker: '',
    text: cue.text,
    ...(cue.style ? { style: toCaptionSegmentStyle(cue.style) } : {}),
  }));
}

export function importSubtitleCuesToCaptionSegments(
  cues: SubtitleCue[],
  options?: ChunkCaptionOptions,
): CaptionSegment[] {
  const segments = subtitleCuesToCaptionSegments(cues);
  return chunkCaptionSegments(segments, options);
}
