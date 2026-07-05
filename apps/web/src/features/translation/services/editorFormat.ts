import { formatSegmentTime } from '@/lib/utils/transcript';
import type { AspectRatioId } from '@/types';
import type { EditorCaptionLimits, EditorSegment } from '@/features/translation/types/editorAI';
import { captionSegmentsToTranscript, parseCaptionSegmentsFromTranscript } from '@vokop/shared';

export function captionLimitsForRatio(ratio: AspectRatioId): EditorCaptionLimits {
  switch (ratio) {
    case '9:16':
    case '3:4':
      return {
        maxChars: 32,
        maxLines: 2,
        hint: 'Short vertical captions (~32 chars, max 2 lines) for mobile/Reels.',
      };
    case '1:1':
      return { maxChars: 36, maxLines: 2, hint: 'Square frame captions (~36 chars, max 2 lines).' };
    case '16:9':
    case '2:1':
      return { maxChars: 48, maxLines: 2, hint: 'Widescreen captions (~48 chars, max 2 lines).' };
    default:
      return { maxChars: 42, maxLines: 2, hint: 'Keep captions concise for on-frame text layers.' };
  }
}

export function normalizeEditorSegment(
  raw: Omit<Partial<EditorSegment>, 'words'> & {
    start?: number;
    end?: number;
    words?: Array<{ text?: string; startSec?: number; endSec?: number }>;
  },
  index: number,
): EditorSegment {
  const startSec = Math.max(0, Number(raw.startSec ?? raw.start ?? 0));
  const endSec =
    raw.endSec != null || raw.end != null
      ? Math.max(startSec + 0.4, Number(raw.endSec ?? raw.end))
      : undefined;
  const speaker = (raw.speaker ?? `Speaker ${index + 1}`).trim() || `Speaker ${index + 1}`;
  const text = (raw.text ?? '').trim();
  const words = Array.isArray(raw.words)
    ? raw.words
        .map((w) =>
          typeof w.text === 'string' &&
          typeof w.startSec === 'number' &&
          typeof w.endSec === 'number'
            ? { text: w.text.trim(), startSec: w.startSec, endSec: w.endSec }
            : null,
        )
        .filter((w): w is { text: string; startSec: number; endSec: number } => w != null)
    : undefined;
  return { startSec, endSec, speaker, text, words };
}

export function editorSegmentsToTranscript(segments: EditorSegment[]): string {
  const captionLike = segments
    .filter((s) => s.text)
    .sort((a, b) => a.startSec - b.startSec)
    .map((s) => ({
      startSec: s.startSec,
      endSec: s.endSec ?? s.startSec + 2,
      speaker: s.speaker,
      text: s.text,
      words: s.words,
    }));
  if (captionLike.some((s) => s.endSec != null)) {
    return captionSegmentsToTranscript(captionLike);
  }
  return segments
    .filter((s) => s.text)
    .sort((a, b) => a.startSec - b.startSec)
    .map((s) => `[${formatSegmentTime(s.startSec)}] ${s.speaker}: ${s.text}`)
    .join('\n');
}

export function parseEditorSegmentsFromTranscript(transcript: string): EditorSegment[] {
  const structured = parseCaptionSegmentsFromTranscript(transcript);
  if (structured.length > 0) {
    return structured.map((s, index) =>
      normalizeEditorSegment(
        {
          startSec: s.startSec,
          endSec: s.endSec,
          speaker: s.speaker,
          text: s.text,
          words: s.words,
        },
        index,
      ),
    );
  }

  const lines = transcript.split('\n').filter((l) => l.trim());
  return lines.map((line, index) => {
    const match = line.match(/\[(\d{2}):(\d{2})\]\s+([^:]+):\s+(.*)/);
    if (match) {
      return normalizeEditorSegment(
        {
          startSec: parseInt(match[1], 10) * 60 + parseInt(match[2], 10),
          speaker: match[3].trim(),
          text: match[4].trim(),
        },
        index,
      );
    }
    return normalizeEditorSegment({ startSec: 0, speaker: 'Speaker', text: line.trim() }, index);
  });
}

export function mergeTranscriptionPayload(payload: {
  detectedLanguage?: string;
  transcript?: string;
  segments?: Partial<EditorSegment>[];
}): { detectedLanguage: string; segments: EditorSegment[]; transcript: string } {
  const detectedLanguage = payload.detectedLanguage?.trim() || 'Unknown';

  let segments: EditorSegment[] = [];
  if (Array.isArray(payload.segments) && payload.segments.length > 0) {
    segments = payload.segments.map((s, i) => normalizeEditorSegment(s, i)).filter((s) => s.text);
  } else if (payload.transcript) {
    segments = parseEditorSegmentsFromTranscript(payload.transcript);
  }

  const transcript =
    payload.transcript?.trim() || editorSegmentsToTranscript(segments) || 'No transcript generated.';

  if (segments.length === 0 && transcript) {
    segments = parseEditorSegmentsFromTranscript(transcript);
  }

  return { detectedLanguage, segments, transcript };
}

export function mergeTranslationPayload(
  payload: { segments?: Partial<EditorSegment>[]; translatedText?: string; translation?: string },
  sourceSegments: EditorSegment[],
): { segments: EditorSegment[]; translatedText: string } {
  let segments: EditorSegment[] = [];

  if (Array.isArray(payload.segments) && payload.segments.length > 0) {
    segments = payload.segments.map((s, i) => {
      const normalized = normalizeEditorSegment(s, i);
      const source = sourceSegments[i];
      return {
        ...normalized,
        startSec: source?.startSec ?? normalized.startSec,
        endSec: source?.endSec ?? normalized.endSec,
        speaker: normalized.speaker || source?.speaker || `Speaker ${i + 1}`,
      };
    });
  }

  const translatedText =
    payload.translatedText?.trim() ||
    payload.translation?.trim() ||
    editorSegmentsToTranscript(segments);

  if (segments.length === 0 && translatedText) {
    segments = parseEditorSegmentsFromTranscript(translatedText).map((s, i) => ({
      ...s,
      startSec: sourceSegments[i]?.startSec ?? s.startSec,
      endSec: sourceSegments[i]?.endSec ?? s.endSec,
      speaker: sourceSegments[i]?.speaker ?? s.speaker,
    }));
  }

  return { segments, translatedText };
}
