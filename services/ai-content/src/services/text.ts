import type { TextAssistRequest, TextAssistResponse } from '@vokop/api';
import { optionsForFeature } from '../llm/capabilities.js';
import { complete } from '../llm/index.js';

const TASK_INSTRUCTIONS: Record<TextAssistRequest['task'], string> = {
  rewrite:
    'Rewrite the text to be clearer and more engaging while preserving meaning. Return only the rewritten text.',
  summarize:
    'Summarize the text in 1-3 concise sentences suitable for a video description. Return only the summary.',
  captions:
    'Turn the text into short on-screen caption lines (≤ 48 characters each). One line per caption. Return only the caption lines.',
  polish:
    'Polish grammar, punctuation, and flow for professional video captions. Keep meaning and length similar. Return only the polished text.',
  expand:
    'Expand the text slightly with natural spoken detail for voiceover. Return only the expanded text.',
};

export async function assistText(input: TextAssistRequest): Promise<TextAssistResponse> {
  const llmOpts = optionsForFeature('text', {
    provider: input.provider,
    model: input.model,
  });

  const langHint = input.language ? ` Language: ${input.language}.` : '';
  const extra = input.instruction ? `\nExtra instruction: ${input.instruction}` : '';

  const { text, provider, model } = await complete(
    `${TASK_INSTRUCTIONS[input.task]}${langHint}${extra}\n\n${input.text}`,
    { ...llmOpts, temperature: input.task === 'summarize' ? 0.3 : 0.5 },
  );

  return {
    task: input.task,
    text,
    provider,
    model,
  };
}
