import type { TranscriptSegment, TranscribeRequest, TranscribeResult } from '@vokop/api';
import { optionsForFeature } from '../llm/capabilities.js';
import { completeJson, completeWithMediaJson } from '../llm/index.js';

interface LlmTranscribePayload {
  detectedLanguage?: string;
  transcript?: string;
  segments?: Array<{
    startSec?: number;
    endSec?: number;
    text?: string;
    speaker?: string;
    speakerId?: string;
  }>;
}

const TRANSCRIBE_PROMPT = `Transcribe spoken dialogue for a video editor timeline.

Rules:
- Detect the primary spoken language.
- Ignore music and non-speech sounds.
- Identify distinct speakers as Speaker 1, Speaker 2, …
- Split into timed segments aligned to speech pauses.
- Keep each segment text short enough for on-screen captions (≤ 48 characters when possible).
- Use startSec/endSec in seconds (decimals OK).

Return JSON only:
{
  "detectedLanguage": "English",
  "transcript": "[00:00] Speaker 1: Short spoken line\\n...",
  "segments": [
    { "startSec": 0.0, "endSec": 3.5, "speakerId": "Speaker 1", "text": "Short spoken line" }
  ]
}`;

function normalizeSegments(raw: LlmTranscribePayload['segments']): TranscriptSegment[] {
  return (raw ?? [])
    .filter(
      (s): s is {
        startSec: number;
        endSec: number;
        text: string;
        speaker?: string;
        speakerId?: string;
      } =>
        typeof s.startSec === 'number' &&
        typeof s.endSec === 'number' &&
        typeof s.text === 'string' &&
        s.text.trim().length > 0 &&
        s.endSec > s.startSec,
    )
    .map((s) => ({
      startSec: s.startSec,
      endSec: s.endSec,
      text: s.text.trim(),
      speakerId: s.speakerId ?? s.speaker,
    }));
}

function buildTranscript(segments: TranscriptSegment[], fallback?: string): string {
  if (fallback?.trim()) return fallback.trim();
  return segments
    .map((seg) => {
      const mm = Math.floor(seg.startSec / 60);
      const ss = Math.floor(seg.startSec % 60);
      const speaker = seg.speakerId ? `${seg.speakerId}: ` : '';
      return `[${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}] ${speaker}${seg.text}`;
    })
    .join('\n');
}

/**
 * Transcribe audio/video via best media-capable provider (302.AI → Gemini model by default).
 */
export async function transcribeMedia(input: TranscribeRequest): Promise<TranscribeResult> {
  const durationHint =
    input.durationSec && input.durationSec > 0
      ? `\nVideo duration: ~${Math.round(input.durationSec)} seconds. Do not place segments beyond this duration.`
      : '';
  const hotwords = input.hotwords ? `\nHotwords (boost): ${input.hotwords}` : '';
  const language = input.language ? `\nPreferred language: ${input.language}` : '';
  const prompt = `${TRANSCRIBE_PROMPT}${durationHint}${hotwords}${language}`;

  const llmOpts = optionsForFeature('transcript', {
    provider: input.provider,
    model: input.model,
  });

  if (input.mediaBase64 && input.mimeType) {
    const result = await completeWithMediaJson<LlmTranscribePayload>(
      prompt,
      {
        data: input.mediaBase64,
        mimeType: input.mimeType,
      },
      llmOpts,
    );
    const segments = normalizeSegments(result.segments);
    return {
      segments,
      transcript: buildTranscript(segments, result.transcript),
      detectedLanguage: result.detectedLanguage,
      provider: llmOpts.provider,
      model: llmOpts.model,
    };
  }

  if (input.sessionId || input.r2Key) {
    const result = await completeJson<LlmTranscribePayload>(
      `${prompt}\n\nNo media bytes were attached. Return an empty segments array and set detectedLanguage to "unknown".`,
      { temperature: 0, ...llmOpts },
    );
    const segments = normalizeSegments(result.segments);
    return {
      segments,
      transcript: buildTranscript(segments, result.transcript),
      detectedLanguage: result.detectedLanguage ?? 'unknown',
      provider: llmOpts.provider,
      model: llmOpts.model,
    };
  }

  throw new Error('Provide mediaBase64+mimeType, or sessionId/r2Key for transcription');
}
