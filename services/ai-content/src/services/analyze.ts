import type { VideoAnalyzeRequest, VideoAnalyzeResponse } from '@vokop/api';
import { optionsForFeature } from '../llm/capabilities.js';
import { completeWithMediaJson } from '../llm/index.js';

interface AnalyzePayload {
  summary?: string;
  highlights?: Array<{ start?: string; end?: string; narration?: string }>;
}

function formatMmSs(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export async function analyzeVideoMedia(
  input: VideoAnalyzeRequest,
): Promise<VideoAnalyzeResponse> {
  const llmOpts = optionsForFeature('analyze', {
    provider: input.provider,
    model: input.model,
  });

  const language = input.language ?? 'English';
  const durationHint =
    input.durationSec && input.durationSec > 0
      ? `\nVideo duration: ~${Math.round(input.durationSec)} seconds.`
      : '';

  const prompt = `Analyze this video for a highlight summary in ${language}.${durationHint}

Provide:
1. A total summary.
2. A list of exactly 5-7 "Highlight Clips". For each clip, specify the start and end timestamp and a short narration script (1 sentence).

Return JSON only:
{
  "summary": "string",
  "highlights": [
    { "start": "MM:SS", "end": "MM:SS", "narration": "string" }
  ]
}`;

  const result = await completeWithMediaJson<AnalyzePayload>(
    prompt,
    { data: input.mediaBase64, mimeType: input.mimeType },
    { ...llmOpts, temperature: 0.3 },
  );

  const highlights = (result.highlights ?? [])
    .filter(
      (h): h is { start: string; end: string; narration: string } =>
        Boolean(h.start && h.end && h.narration),
    )
    .map((h) => ({
      start: h.start,
      end: h.end,
      narration: h.narration.trim(),
    }));

  return {
    summary: result.summary?.trim() || 'No summary available.',
    highlights:
      highlights.length > 0
        ? highlights
        : [
            {
              start: '00:00',
              end: formatMmSs(input.durationSec ?? 10),
              narration: result.summary?.trim() || 'Highlight',
            },
          ],
    provider: llmOpts.provider,
    model: llmOpts.model,
  };
}
