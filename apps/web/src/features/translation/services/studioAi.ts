/**
 * Studio AI client — all LLM work goes through the gateway → ai-content.
 * Do not call Gemini/OpenAI/Claude SDKs from the browser.
 */

import { api } from '@/lib/api';
import type { AspectRatioId, VideoAnalysis } from '@/types';
import type {
  EditorSegment,
  TranscriptionResult,
  TranslationResult,
} from '@/features/translation/types/editorAI';
import {
  editorSegmentsToTranscript,
  normalizeEditorSegment,
} from '@/features/translation/services/editorFormat';

/** Map legacy Gemini voice ids to OpenAI-compatible TTS voices (302.AI / OpenAI). */
const TTS_VOICE_MAP: Record<string, string> = {
  Kore: 'nova',
  Zephyr: 'shimmer',
  Puck: 'echo',
  Charon: 'onyx',
  Fenrir: 'fable',
};

function toTtsVoice(voice?: string): string {
  if (!voice) return 'nova';
  return TTS_VOICE_MAP[voice] ?? voice;
}

function toApiSegments(segments: EditorSegment[]) {
  return segments.map((s, i) => {
    const startSec = s.startSec;
    const endSec = s.endSec ?? startSec + 2;
    return {
      startSec,
      endSec: endSec > startSec ? endSec : startSec + 0.4,
      text: s.text,
      speakerId: s.speaker || `Speaker ${i + 1}`,
      ...(s.words?.length ? { words: s.words } : {}),
    };
  });
}

function fromApiSegments(
  segments: Array<{
    startSec?: number;
    endSec?: number;
    text?: string;
    speakerId?: string;
    words?: Array<{ text?: string; startSec?: number; endSec?: number }>;
  }>,
): EditorSegment[] {
  return segments
    .filter((s) => typeof s.startSec === 'number' && typeof s.text === 'string')
    .map((s, i) =>
      normalizeEditorSegment(
        {
          startSec: s.startSec,
          endSec: s.endSec,
          speaker: s.speakerId,
          text: s.text,
          words: s.words,
        },
        i,
      ),
    );
}

export async function transcribeVideo(
  videoBase64: string,
  mimeType: string,
  videoDurationSec?: number,
  sessionId?: string | null,
): Promise<TranscriptionResult> {
  const started = await api.startTranscribe({
    ...(sessionId ? { sessionId } : { mediaBase64: videoBase64, mimeType }),
    durationSec: videoDurationSec,
  });
  const job = await api.waitForAiJob(started.jobId);
  const segments = fromApiSegments(job.segments ?? []);
  const transcript =
    job.transcript?.trim() ||
    editorSegmentsToTranscript(segments) ||
    '';
  const detectedLanguage =
    (job.result?.detectedLanguage as string | undefined) ?? 'unknown';

  return {
    detectedLanguage,
    segments,
    transcript,
  };
}

export async function translateSegmentsForEditor(
  segments: EditorSegment[],
  targetLanguage: string,
  sourceLanguage?: string,
  _aspectRatio: AspectRatioId = 'original',
): Promise<TranslationResult> {
  const result = await api.translate({
    targetLanguage,
    sourceLanguage,
    segments: toApiSegments(segments),
  });

  const translatedSegments = result.segments?.length
    ? fromApiSegments(result.segments)
    : segments.map((s, i) =>
        normalizeEditorSegment({ ...s, text: result.translatedText }, i),
      );

  return {
    segments: translatedSegments,
    translatedText:
      result.translatedText.trim() || editorSegmentsToTranscript(translatedSegments),
  };
}

/** Translate a flat transcript string (legacy path). */
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string,
  aspectRatio: AspectRatioId = 'original',
): Promise<string> {
  const segments = text
    .split('\n')
    .filter((l) => l.trim())
    .map((line, index) => {
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
      return normalizeEditorSegment({ startSec: 0, speaker: 'Speaker', text: line }, index);
    });

  if (segments.length === 0) {
    const result = await api.translate({
      text,
      targetLanguage,
      sourceLanguage,
    });
    return result.translatedText;
  }

  const result = await translateSegmentsForEditor(
    segments,
    targetLanguage,
    sourceLanguage,
    aspectRatio,
  );
  return result.translatedText;
}

export async function retranslateSegment(
  segment: EditorSegment,
  targetLanguage: string,
  sourceLanguage?: string,
  aspectRatio: AspectRatioId = 'original',
): Promise<string> {
  const result = await translateSegmentsForEditor(
    [segment],
    targetLanguage,
    sourceLanguage,
    aspectRatio,
  );
  return result.segments[0]?.text ?? result.translatedText;
}

export async function analyzeVideo(
  videoBase64: string,
  mimeType: string,
  language: string,
): Promise<VideoAnalysis> {
  const result = await api.analyzeVideo({
    mediaBase64: videoBase64,
    mimeType,
    language,
  });
  return {
    summary: result.summary,
    highlights: result.highlights.map((h) => ({
      start: h.start,
      end: h.end,
      narration: h.narration,
    })),
  };
}

export async function generateSpeech(text: string, voice: string = 'Kore'): Promise<string> {
  const result = await api.synthesizeSpeech({
    text,
    voice: toTtsVoice(voice),
    format: 'mp3',
  });
  return result.audioBase64;
}

export async function generateMultiSpeakerSpeech(
  text: string,
  speakerVoices: Record<string, string>,
): Promise<string> {
  const speakerEntries = Object.entries(speakerVoices);
  const defaultVoice = speakerEntries.length > 0 ? speakerEntries[0][1] : 'Kore';
  // Server TTS is single-voice OpenAI-compatible; multi-speaker Gemini path removed.
  return generateSpeech(text, defaultVoice);
}

/** Regenerate voiceover from current editor translation text. */
export async function generateVoiceoverForEditor(
  translatedText: string,
  speakerVoices: Record<string, string>,
): Promise<string> {
  if (!translatedText.trim()) throw new Error('No translation text to synthesize.');
  return generateMultiSpeakerSpeech(translatedText, speakerVoices);
}

export { editorSegmentsToTranscript };
