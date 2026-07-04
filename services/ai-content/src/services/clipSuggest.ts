import type { ClipRange, ClipSuggestRequest, ClipSuggestResponse } from '@vokop/api';
import { optionsForFeature } from '../llm/capabilities.js';
import { completeJson } from '../llm/index.js';

interface LlmClipPayload {
  clips?: Array<{
    startSec?: number;
    endSec?: number;
    title?: string;
    reason?: string;
  }>;
  summary?: string;
}

export async function suggestClipsFromTranscript(
  input: ClipSuggestRequest,
): Promise<ClipSuggestResponse> {
  const maxClips = input.maxClips ?? 5;
  const userPrompt = input.prompt?.trim() || 'Find the most engaging highlight clips.';

  const segmentHint = input.segments?.length
    ? `\nTimed segments:\n${JSON.stringify(input.segments.slice(0, 100))}`
    : '';

  const prompt = `You are a video editor assistant (FunClip-style clip assist).

User request: ${userPrompt}
Max clips: ${maxClips}

Transcript:
${input.transcript.slice(0, 16_000)}
${segmentHint}

Return JSON only:
{
  "summary": "one sentence overview",
  "clips": [
    { "startSec": 0.0, "endSec": 8.5, "title": "short title", "reason": "why this clip" }
  ]
}

Rules:
- Clips must be within the transcript timeline.
- Prefer speech-aligned ranges; avoid empty/music-only spans when possible.
- startSec < endSec; durations typically 3–30 seconds.
- Return at most ${maxClips} clips, ranked best-first.`;

  const result = await completeJson<LlmClipPayload>(prompt, {
    temperature: 0.35,
    ...optionsForFeature('clips', {
      provider: input.provider,
      model: input.model,
    }),
  });

  const clips: ClipRange[] = (result.clips ?? [])
    .filter(
      (c): c is { startSec: number; endSec: number; title?: string; reason?: string } =>
        typeof c.startSec === 'number' &&
        typeof c.endSec === 'number' &&
        c.endSec > c.startSec,
    )
    .slice(0, maxClips)
    .map((c) => ({
      startSec: c.startSec,
      endSec: c.endSec,
      title: c.title,
      reason: c.reason,
    }));

  return {
    clips,
    summary: result.summary,
  };
}
