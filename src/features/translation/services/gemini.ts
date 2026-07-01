import { GoogleGenAI, Modality } from '@google/genai';
import type { AspectRatioId, VideoAnalysis } from '@/types';
import type {
  EditorSegment,
  TranscriptionResult,
  TranslationResult,
} from '@/features/translation/types/editorAI';
import {
  captionLimitsForRatio,
  editorSegmentsToTranscript,
  mergeTranscriptionPayload,
  mergeTranslationPayload,
  normalizeEditorSegment,
} from '@/features/translation/services/editorFormat';

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not configured. Add it to your .env file.');
  return key;
}

const ai = new GoogleGenAI({ apiKey: getApiKey() });

async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000,
): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    const err = error as { status?: number };
    if (retries > 0 && (err.status === 500 || err.status === 503 || err.status === 429)) {
      console.warn(`Gemini API error (${err.status}). Retrying in ${delay}ms… (${retries} left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

function parseJsonResponse<T>(text: string | undefined): T {
  if (!text?.trim()) throw new Error('Empty response from Gemini');
  return JSON.parse(text) as T;
}

const EDITOR_TRANSCRIBE_PROMPT = `Transcribe spoken dialogue in this video for a video editor with timeline + canvas caption layers.

Rules:
- Detect the primary spoken language.
- Ignore music and non-speech sounds.
- Identify distinct speakers (Speaker 1, Speaker 2, …).
- Split into timed segments aligned to speech pauses.
- Keep each segment text short enough for on-screen captions (≤ 48 characters when possible).
- Use startSec/endSec in seconds (decimals OK).

Return JSON only:
{
  "detectedLanguage": "English",
  "segments": [
    { "startSec": 0.0, "endSec": 3.5, "speaker": "Speaker 1", "text": "Short spoken line" }
  ],
  "transcript": "[00:00] Speaker 1: Short spoken line\\n..."
}`;

export async function transcribeVideo(
  videoBase64: string,
  mimeType: string,
  videoDurationSec?: number,
): Promise<TranscriptionResult> {
  return withRetry(async () => {
    const durationHint =
      videoDurationSec && videoDurationSec > 0
        ? `\nVideo duration: ~${Math.round(videoDurationSec)} seconds. Do not place segments beyond this duration.`
        : '';

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { inlineData: { data: videoBase64, mimeType } },
            { text: EDITOR_TRANSCRIBE_PROMPT + durationHint },
          ],
        },
      ],
      config: { responseMimeType: 'application/json' },
    });

    const payload = parseJsonResponse<{
      detectedLanguage?: string;
      transcript?: string;
      segments?: Partial<EditorSegment>[];
    }>(response.text);

    const merged = mergeTranscriptionPayload(payload);
    return {
      detectedLanguage: merged.detectedLanguage,
      segments: merged.segments,
      transcript: merged.transcript,
    };
  });
}

export async function translateSegmentsForEditor(
  segments: EditorSegment[],
  targetLanguage: string,
  sourceLanguage?: string,
  aspectRatio: AspectRatioId = 'original',
): Promise<TranslationResult> {
  return withRetry(async () => {
    const limits = captionLimitsForRatio(aspectRatio);
    const sourceContext = sourceLanguage ? `from ${sourceLanguage} ` : '';
    const payload = segments.map((s) => ({
      startSec: s.startSec,
      endSec: s.endSec,
      speaker: s.speaker,
      text: s.text,
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Translate these timed caption segments ${sourceContext}into ${targetLanguage} for a video editor.

Editor constraints:
- ${limits.hint}
- Preserve startSec, endSec, and speaker for every segment.
- Keep the same number of segments and order.
- Translation text must fit on canvas caption layers.

Input segments JSON:
${JSON.stringify(payload, null, 2)}

Return JSON only:
{
  "segments": [
    { "startSec": 0, "endSec": 3.5, "speaker": "Speaker 1", "text": "Translated line" }
  ],
  "translatedText": "[00:00] Speaker 1: Translated line\\n..."
}`,
      config: { responseMimeType: 'application/json' },
    });

    const result = parseJsonResponse<{
      segments?: Partial<EditorSegment>[];
      translatedText?: string;
      translation?: string;
    }>(response.text);

    const merged = mergeTranslationPayload(result, segments);
    return {
      segments: merged.segments,
      translatedText: merged.translatedText,
    };
  });
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
    return withRetry(async () => {
      const sourceContext = sourceLanguage ? `from ${sourceLanguage} ` : '';
      const limits = captionLimitsForRatio(aspectRatio);
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Translate ${sourceContext}into ${targetLanguage}. Keep [MM:SS] Speaker: format. ${limits.hint}\n\n${text}`,
      });
      return response.text ?? '';
    });
  }

  const result = await translateSegmentsForEditor(
    segments,
    targetLanguage,
    sourceLanguage,
    aspectRatio,
  );
  return result.translatedText;
}

/** Re-translate a single timeline/canvas segment (editor inline edit assist). */
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
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { inlineData: { data: videoBase64, mimeType } },
            {
              text: `Analyze this video for a highlight summary in ${language}.
Provide:
1. A total summary.
2. A list of exactly 5-7 "Highlight Clips". For each clip, specify the start and end timestamp and a short narration script (1 sentence).

Format as JSON: 
{ 
  "summary": "string",
  "highlights": [
    { "start": "MM:SS", "end": "MM:SS", "narration": "string" }
  ]
}`,
            },
          ],
        },
      ],
      config: { responseMimeType: 'application/json' },
    });
    return parseJsonResponse<VideoAnalysis>(response.text);
  });
}

function stripTimestampsForTts(text: string): string {
  return text.replace(/\[\d{2}:\d{2}\]\s+/g, '');
}

export async function generateMultiSpeakerSpeech(text: string, speakerVoices: Record<string, string>) {
  return withRetry(async () => {
    const speakerEntries = Object.entries(speakerVoices);
    const cleanText = stripTimestampsForTts(text);

    if (speakerEntries.length === 2) {
      try {
        const speakerConfigs = speakerEntries.map(([speaker, voice]) => ({
          speaker,
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
        }));

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-preview-tts',
          contents: [{ parts: [{ text: `TTS the following conversation:\n${cleanText}` }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              multiSpeakerVoiceConfig: { speakerVoiceConfigs: speakerConfigs },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) return base64Audio;
        console.warn('Multi-speaker TTS returned no audio, falling back to single speaker.');
      } catch (error) {
        console.warn('Multi-speaker TTS failed, falling back:', error);
      }
    }

    const defaultVoice = speakerEntries.length > 0 ? speakerEntries[0][1] : 'Kore';
    return generateSpeech(cleanText, defaultVoice);
  });
}

export async function generateSpeech(text: string, voice: string = 'Kore') {
  return withRetry(async () => {
    const cleanText = stripTimestampsForTts(text);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error('Failed to generate audio');
    return base64Audio;
  });
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
