import type { AgentRunRequest, AgentRunResponse, ClipRange, TranscriptSegment } from '@vokop/api';
import { optionsForFeature } from '../llm/capabilities.js';
import { completeJson } from '../llm/index.js';
import { suggestClipsFromTranscript } from '../services/clipSuggest.js';

const SYSTEM = `You are Vokop Studio Agent — an assistant for a CapCut-style video editor.

You help editors with:
- Clip selection from transcripts
- Caption / subtitle planning
- Timeline editing suggestions
- Short answers about the current project context

Respond with JSON only:
{
  "message": "short reply to the user",
  "actions": [
    { "type": "suggest_clips" | "build_subtitles" | "none" | "info", "payload": {} }
  ],
  "clips": [ { "startSec": 0, "endSec": 5, "title": "...", "reason": "..." } ]
}

Rules:
- Prefer concrete timeline actions when the user asks to find highlights or clips.
- If transcript/segments are missing and clips are requested, set actions to info and explain what is needed.
- Keep message concise (1–3 sentences).
- clips may be empty when not applicable.`;

interface AgentLlmResult {
  message?: string;
  actions?: Array<{ type: string; payload?: Record<string, unknown> }>;
  clips?: ClipRange[];
}

function formatContext(input: AgentRunRequest): string {
  const parts: string[] = [`User message: ${input.message}`];
  if (input.projectId) parts.push(`projectId: ${input.projectId}`);
  if (input.sessionId) parts.push(`sessionId: ${input.sessionId}`);
  if (input.transcript) {
    parts.push(`Transcript:\n${input.transcript.slice(0, 12_000)}`);
  }
  if (input.segments?.length) {
    parts.push(
      `Segments (JSON):\n${JSON.stringify(input.segments.slice(0, 80))}`,
    );
  }
  if (input.context && Object.keys(input.context).length > 0) {
    parts.push(`Extra context:\n${JSON.stringify(input.context).slice(0, 4000)}`);
  }
  return parts.join('\n\n');
}

/**
 * Run the studio agent: LLM plans actions, then we execute known tools
 * (clip-suggest) when transcript context is available.
 */
export async function runStudioAgent(input: AgentRunRequest): Promise<AgentRunResponse> {
  const llmOpts = optionsForFeature('agent', {
    provider: input.provider,
    model: input.model,
  });

  const plan = await completeJson<AgentLlmResult>(formatContext(input), {
    system: SYSTEM,
    temperature: 0.3,
    ...llmOpts,
  });

  const actions: AgentRunResponse['actions'] = plan.actions?.length
    ? plan.actions.map((a) => ({ type: a.type, payload: a.payload }))
    : [{ type: 'info' }];

  let clips: ClipRange[] | undefined = plan.clips;

  const wantsClips = actions.some(
    (a) => a.type === 'suggest_clips' || /clip|highlight|cut/i.test(input.message),
  );

  if (wantsClips && (input.transcript || input.segments?.length)) {
    const transcript =
      input.transcript ??
      (input.segments as TranscriptSegment[])
        .map((s) => `[${s.startSec.toFixed(1)}-${s.endSec.toFixed(1)}] ${s.text}`)
        .join('\n');

    const suggested = await suggestClipsFromTranscript({
      transcript,
      segments: input.segments,
      prompt: input.message,
      maxClips: 5,
      projectId: input.projectId,
      ...llmOpts,
    });
    clips = suggested.clips;
    if (!actions.some((a) => a.type === 'suggest_clips')) {
      actions.push({ type: 'suggest_clips', payload: { count: clips.length } });
    }
  }

  return {
    message: plan.message?.trim() || 'Done.',
    actions,
    clips,
  };
}
