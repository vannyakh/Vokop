import type { TranscriptSegment, TranslateRequest, TranslateResponse } from '@vokop/api';
import { optionsForFeature } from '../llm/capabilities.js';
import { complete, completeJson } from '../llm/index.js';

interface SegmentTranslatePayload {
  segments?: Array<{
    startSec?: number;
    endSec?: number;
    text?: string;
    speakerId?: string;
  }>;
  translatedText?: string;
}

function formatTranscriptLine(seg: TranscriptSegment): string {
  const mm = Math.floor(seg.startSec / 60);
  const ss = Math.floor(seg.startSec % 60);
  const speaker = seg.speakerId ? `${seg.speakerId}: ` : '';
  return `[${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}] ${speaker}${seg.text}`;
}

export async function translateContent(input: TranslateRequest): Promise<TranslateResponse> {
  const llmOpts = optionsForFeature('translate', {
    provider: input.provider,
    model: input.model,
  });
  const sourceHint = input.sourceLanguage ? `from ${input.sourceLanguage} ` : '';

  if (input.segments?.length) {
    const prompt = `Translate these timed caption segments ${sourceHint}into ${input.targetLanguage} for a video editor.

Rules:
- Preserve startSec, endSec, and speakerId for every segment.
- Keep the same number of segments and order.
- Keep each line short enough for on-screen captions (≤ 48 characters when possible).
- Natural, spoken-language translation.

Input segments JSON:
${JSON.stringify(input.segments)}

Return JSON only:
{
  "segments": [
    { "startSec": 0, "endSec": 3.5, "speakerId": "Speaker 1", "text": "Translated line" }
  ],
  "translatedText": "[00:00] Speaker 1: Translated line\\n..."
}`;

    const result = await completeJson<SegmentTranslatePayload>(prompt, {
      ...llmOpts,
      temperature: 0.2,
    });

    const segments: TranscriptSegment[] = (result.segments ?? [])
      .filter(
        (s): s is TranscriptSegment =>
          typeof s.startSec === 'number' &&
          typeof s.endSec === 'number' &&
          typeof s.text === 'string' &&
          s.text.trim().length > 0,
      )
      .map((s) => ({
        startSec: s.startSec,
        endSec: s.endSec,
        text: s.text.trim(),
        speakerId: s.speakerId,
      }));

    // Preserve timing if model dropped fields
    const aligned =
      segments.length === input.segments.length
        ? segments.map((s, i) => ({
            ...s,
            startSec: input.segments![i]!.startSec,
            endSec: input.segments![i]!.endSec,
            speakerId: s.speakerId ?? input.segments![i]!.speakerId,
          }))
        : input.segments.map((orig, i) => ({
            ...orig,
            text: segments[i]?.text ?? orig.text,
          }));

    return {
      targetLanguage: input.targetLanguage,
      sourceLanguage: input.sourceLanguage,
      segments: aligned,
      translatedText:
        result.translatedText?.trim() || aligned.map(formatTranscriptLine).join('\n'),
      provider: llmOpts.provider,
      model: llmOpts.model,
    };
  }

  const text = input.text?.trim();
  if (!text) {
    throw new Error('Provide text or segments to translate');
  }

  const { text: translatedText, provider, model } = await complete(
    `Translate ${sourceHint}into ${input.targetLanguage}. Return only the translation, no quotes or commentary.\n\n${text}`,
    { ...llmOpts, temperature: 0.2 },
  );

  return {
    targetLanguage: input.targetLanguage,
    sourceLanguage: input.sourceLanguage,
    translatedText,
    provider,
    model,
  };
}
