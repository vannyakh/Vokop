import type { CaptionSegment, CaptionWord } from '../types/captions.js';
import type { Segment } from '../types/studio.js';

const MIN_WORD_SEC = 0.08;

export function formatCaptionTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function parseCaptionTime(token: string): number | null {
  const match = token.trim().match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

export function normalizeCaptionWord(raw: Partial<CaptionWord>, index: number): CaptionWord | null {
  const text = (raw.text ?? '').trim();
  if (!text) return null;
  const startSec = Math.max(0, Number(raw.startSec ?? 0));
  const endSec = Math.max(startSec + MIN_WORD_SEC, Number(raw.endSec ?? startSec + 0.3));
  return { text, startSec, endSec: endSec > startSec ? endSec : startSec + MIN_WORD_SEC };
}

export function normalizeCaptionSegment(
  raw: Partial<CaptionSegment> & { start?: number; end?: number; speakerId?: string },
  index: number,
  fallbackEndSec?: number,
): CaptionSegment | null {
  const startSec = Math.max(0, Number(raw.startSec ?? raw.start ?? 0));
  const endSec = Math.max(
    startSec + 0.4,
    Number(raw.endSec ?? raw.end ?? fallbackEndSec ?? startSec + 2),
  );
  const speaker = (raw.speaker ?? raw.speakerId ?? `Speaker ${index + 1}`).trim() || `Speaker ${index + 1}`;
  const text = (raw.text ?? '').trim();
  if (!text) return null;

  let words = Array.isArray(raw.words)
    ? raw.words
        .map((w, i) => normalizeCaptionWord(w, i))
        .filter((w): w is CaptionWord => w != null)
    : undefined;

  if (!words?.length) {
    words = distributeWordsEvenly(text, startSec, endSec);
  }

  return { startSec, endSec, speaker, text, words };
}

/** Split segment text into evenly timed words when ASR did not return word timings. */
export function distributeWordsEvenly(text: string, startSec: number, endSec: number): CaptionWord[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const span = Math.max(MIN_WORD_SEC * tokens.length, endSec - startSec);
  const step = span / tokens.length;
  return tokens.map((token, i) => ({
    text: token,
    startSec: startSec + i * step,
    endSec: startSec + (i + 1) * step,
  }));
}

export function captionSegmentsToTranscript(segments: CaptionSegment[]): string {
  return segments
    .filter((s) => s.text)
    .sort((a, b) => a.startSec - b.startSec)
    .map((s) => {
      const range = `[${formatCaptionTime(s.startSec)}-${formatCaptionTime(s.endSec)}]`;
      return `${range} ${s.speaker}: ${s.text}`;
    })
    .join('\n');
}

/** Parse `[MM:SS-MM:SS] Speaker: text` or legacy `[MM:SS] Speaker: text`. */
export function parseCaptionSegmentsFromTranscript(transcript: string): CaptionSegment[] {
  const lines = transcript.split('\n').filter((l) => l.trim());
  const parsed: CaptionSegment[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const rangeMatch = line.match(/\[(\d{2}:\d{2})(?:-(\d{2}:\d{2}))?\]\s+([^:]+):\s+(.*)/);
    if (!rangeMatch) continue;

    const startSec = parseCaptionTime(rangeMatch[1]!) ?? 0;
    let endSec = rangeMatch[2] ? parseCaptionTime(rangeMatch[2]) : null;
    if (endSec == null) {
      const next = lines[i + 1]?.match(/\[(\d{2}:\d{2})/);
      endSec = next ? parseCaptionTime(next[1]!) ?? startSec + 2 : startSec + 2;
    }

    const segment = normalizeCaptionSegment(
      {
        startSec,
        endSec: endSec ?? startSec + 2,
        speaker: rangeMatch[3]!.trim(),
        text: rangeMatch[4]!.trim(),
      },
      i,
    );
    if (segment) parsed.push(segment);
  }

  return parsed;
}

export function captionSegmentsToLegacySegments(segments: CaptionSegment[]): Segment[] {
  return segments.map((s) => ({
    time: s.startSec,
    endTime: s.endSec,
    speaker: s.speaker,
    text: s.text,
    raw: `[${formatCaptionTime(s.startSec)}-${formatCaptionTime(s.endSec)}] ${s.speaker}: ${s.text}`,
    words: s.words,
  }));
}

export function legacySegmentsToCaptionSegments(segments: Segment[], totalDuration: number): CaptionSegment[] {
  return segments.map((seg, index) => {
    const startSec = seg.time;
    const endSec =
      seg.endTime ??
      (index < segments.length - 1 ? segments[index + 1]!.time : Math.max(totalDuration, startSec + 2));
    return normalizeCaptionSegment(
      {
        startSec,
        endSec,
        speaker: seg.speaker,
        text: seg.text,
        words: seg.words,
      },
      index,
    )!;
  });
}

export function updateCaptionSegmentText(
  segments: CaptionSegment[],
  index: number,
  text: string,
): CaptionSegment[] {
  const updated = [...segments];
  const current = updated[index];
  if (!current) return segments;
  const words = distributeWordsEvenly(text, current.startSec, current.endSec);
  updated[index] = { ...current, text, words };
  return updated;
}

export function updateCaptionWordTiming(
  segments: CaptionSegment[],
  segmentIndex: number,
  wordIndex: number,
  patch: Partial<Pick<CaptionWord, 'startSec' | 'endSec' | 'text'>>,
): CaptionSegment[] {
  const updated = [...segments];
  const segment = updated[segmentIndex];
  if (!segment?.words?.[wordIndex]) return segments;

  const words = [...segment.words];
  const word = { ...words[wordIndex]!, ...patch };
  if (word.endSec <= word.startSec) word.endSec = word.startSec + MIN_WORD_SEC;
  words[wordIndex] = word;

  updated[segmentIndex] = {
    ...segment,
    words,
    text: words.map((w) => w.text).join(' '),
    startSec: words[0]?.startSec ?? segment.startSec,
    endSec: words[words.length - 1]?.endSec ?? segment.endSec,
  };
  return updated;
}

export function getActiveCaptionWordIndex(words: CaptionWord[] | undefined, currentSec: number): number {
  if (!words?.length) return -1;
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    if (currentSec >= w.startSec && currentSec < w.endSec) return i;
  }
  return -1;
}

export function getActiveCaptionSegmentIndex(segments: CaptionSegment[], currentSec: number): number {
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    if (currentSec >= seg.startSec && currentSec < seg.endSec) return i;
  }
  return -1;
}

export function fromApiCaptionSegments(
  segments: Array<{
    startSec?: number;
    endSec?: number;
    text?: string;
    speakerId?: string;
    speaker?: string;
    words?: Array<{ text?: string; startSec?: number; endSec?: number }>;
  }>,
): CaptionSegment[] {
  return segments
    .map((s, i) => {
      const words = Array.isArray(s.words)
        ? s.words
            .map((w, wi) => normalizeCaptionWord(w, wi))
            .filter((w): w is CaptionWord => w != null)
        : undefined;

      return normalizeCaptionSegment(
        {
          startSec: s.startSec,
          endSec: s.endSec,
          speaker: s.speaker ?? s.speakerId,
          text: s.text,
          words,
        },
        i,
      );
    })
    .filter((s): s is CaptionSegment => s != null);
}
